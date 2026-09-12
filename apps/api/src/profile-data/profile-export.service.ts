import { createReadStream } from "fs";
import { stat } from "fs/promises";
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import type { ProfileExportStatus } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { bullmqConnection } from "../lib/redis-connection";
import { resolveSyncMode } from "../lib/runtime-config";
import {
  PROFILE_EXPORT_IN_FLIGHT,
  PROFILE_EXPORT_QUEUE,
} from "./profile-data.constants";
import { ProfileExportBuildService } from "./profile-export-build.service";
import {
  ensureProfileExportDir,
  profileExportZipPath,
} from "./profile-export-dir";

type ExportJobData = { userId: string; jobId: string };

@Injectable()
export class ProfileExportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProfileExportService.name);
  private queue: Queue<ExportJobData> | null = null;
  private worker: Worker<ExportJobData> | null = null;
  private inlineMode = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly build: ProfileExportBuildService,
  ) {}

  async onModuleInit() {
    const interrupted = await this.prisma.profileExportJob.updateMany({
      where: { status: { in: [...PROFILE_EXPORT_IN_FLIGHT] } },
      data: {
        status: "failed",
        lastError: "Interrupted by API restart",
        completedAt: new Date(),
      },
    });
    if (interrupted.count > 0) {
      this.logger.warn(
        `Marked ${interrupted.count} interrupted profile export(s) as failed`,
      );
    }

    const mode = resolveSyncMode();
    if (mode === "inline") {
      this.inlineMode = true;
      this.logger.log("Using inline profile export (no Redis queue)");
      return;
    }

    const redisUrl = process.env.REDIS_URL!.trim();
    try {
      const connection = bullmqConnection(redisUrl);
      this.queue = new Queue<ExportJobData>(PROFILE_EXPORT_QUEUE, {
        connection,
      });
      this.worker = new Worker<ExportJobData>(
        PROFILE_EXPORT_QUEUE,
        async (job) => this.process(job.data),
        { connection, concurrency: 1 },
      );
      this.queue.on("error", (err) => {
        this.logger.warn(`Profile export queue Redis error: ${err.message}`);
      });
      this.worker.on("error", (err) => {
        this.logger.warn(`Profile export worker Redis error: ${err.message}`);
      });
      await this.queue.waitUntilReady();
      this.logger.log("Using BullMQ profile export via Redis");
    } catch (err) {
      this.logger.warn(`BullMQ unavailable, using inline profile export: ${err}`);
      this.inlineMode = true;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(userId: string) {
    const inFlight = await this.prisma.profileExportJob.findFirst({
      where: { userId, status: { in: [...PROFILE_EXPORT_IN_FLIGHT] } },
    });
    if (inFlight) {
      throw new ConflictException("A profile export is already in progress");
    }

    const job = await this.prisma.profileExportJob.create({
      data: { userId, status: "pending" },
    });
    const payload: ExportJobData = { userId, jobId: job.id };
    if (this.inlineMode || !this.queue) {
      void this.process(payload).catch((err) => {
        this.logger.error(`Inline profile export failed: ${err}`);
      });
    } else {
      await this.queue.add("export", payload, {
        removeOnComplete: 20,
        removeOnFail: 20,
      });
    }
    return this.getStatus(userId);
  }

  async getStatus(userId: string): Promise<ProfileExportStatus> {
    await this.purgeExpired(userId);
    const inFlight = await this.prisma.profileExportJob.findFirst({
      where: { userId, status: { in: [...PROFILE_EXPORT_IN_FLIGHT] } },
      orderBy: { createdAt: "desc" },
    });
    const retained = await this.findRetained(userId);
    const latestFailed = await this.prisma.profileExportJob.findFirst({
      where: { userId, status: "failed" },
      orderBy: { createdAt: "desc" },
    });

    if (inFlight) {
      const base = this.serialize(inFlight, Boolean(retained));
      if (!retained) return base;
      return {
        ...base,
        downloadReady: true,
        fileName: retained.fileName,
        byteSize: retained.byteSize,
        expiresAt: retained.expiresAt?.toISOString() ?? null,
      };
    }
    if (retained) {
      return this.serialize(retained, true);
    }
    if (latestFailed) {
      return this.serialize(latestFailed, false);
    }
    return {
      status: "none",
      inProgress: false,
      downloadReady: false,
      fileName: null,
      byteSize: null,
      expiresAt: null,
      lastError: null,
      createdAt: null,
      completedAt: null,
    };
  }

  async openFile(userId: string) {
    await this.purgeExpired(userId);
    const retained = await this.findRetained(userId);
    if (!retained?.storageKey || !retained.fileName) {
      throw new NotFoundException("No profile export is available to download");
    }
    const path = profileExportZipPath(retained.storageKey);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException("Profile export file is missing");
    }
    return {
      stream: createReadStream(path),
      fileName: retained.fileName,
    };
  }

  async purgeExpired(userId?: string) {
    await ensureProfileExportDir();
    const expired = await this.prisma.profileExportJob.findMany({
      where: {
        status: "completed",
        expiresAt: { lte: new Date() },
        ...(userId ? { userId } : {}),
      },
    });
    for (const job of expired) {
      await this.build.deleteStoredFile(job.storageKey);
      await this.prisma.profileExportJob.delete({ where: { id: job.id } });
    }
    return { deleted: expired.length };
  }

  private async findRetained(userId: string) {
    const now = new Date();
    return this.prisma.profileExportJob.findFirst({
      where: {
        userId,
        status: "completed",
        storageKey: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { completedAt: "desc" },
    });
  }

  private async process(data: ExportJobData) {
    const { userId, jobId } = data;
    await this.prisma.profileExportJob.update({
      where: { id: jobId },
      data: { status: "running", startedAt: new Date(), lastError: null },
    });
    try {
      const built = await this.build.buildZip(userId, jobId);
      const previous = await this.prisma.profileExportJob.findMany({
        where: {
          userId,
          status: "completed",
          id: { not: jobId },
        },
      });
      for (const old of previous) {
        await this.build.deleteStoredFile(old.storageKey);
        await this.prisma.profileExportJob.delete({ where: { id: old.id } });
      }
      await this.prisma.profileExportJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          storageKey: built.storageKey,
          fileName: built.fileName,
          byteSize: built.byteSize,
          completedAt: new Date(),
          expiresAt: built.expiresAt,
          lastError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Profile export ${jobId} failed: ${message}`);
      await this.prisma.profileExportJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          lastError: message,
          completedAt: new Date(),
        },
      });
    }
  }

  private serialize(
    job: {
      status: string;
      fileName: string | null;
      byteSize: number | null;
      expiresAt: Date | null;
      lastError: string | null;
      createdAt: Date;
      completedAt: Date | null;
    },
    downloadReady: boolean,
  ): ProfileExportStatus {
    const inProgress =
      job.status === "pending" || job.status === "running";
    return {
      status: job.status as ProfileExportStatus["status"],
      inProgress,
      downloadReady,
      fileName: downloadReady ? job.fileName : job.fileName,
      byteSize: job.byteSize,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      lastError: job.lastError,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}
