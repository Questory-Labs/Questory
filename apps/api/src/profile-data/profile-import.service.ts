import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { readFile, rm } from "fs/promises";
import {
  QuestoryProfileArchiveSchema,
  type ProfileImportJob,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PROFILE_IMPORT_SOURCE } from "./profile-data.constants";
import {
  ensureImportJobRunningLock,
  isPrismaAdmissionConflict,
} from "./profile-data.locks";
import { unzipProfileArchiveJson } from "./profile-zip";
import { ProfileImportGamesService } from "./profile-import-games.service";
import { ProfileImportMediaService } from "./profile-import-media.service";

function serializeJob(job: {
  id: string;
  source: string;
  status: string;
  fileName: string | null;
  total: number;
  accepted: number;
  skipped: number;
  lastError: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): ProfileImportJob {
  const processed = job.accepted + job.skipped;
  const percent =
    job.total > 0
      ? Math.min(100, Math.round((processed / job.total) * 100))
      : null;
  const phase =
    job.status === "running"
      ? job.total > 0
        ? ("importing" as const)
        : ("parsing" as const)
      : job.status;
  return {
    id: job.id,
    source: job.source,
    status: job.status,
    fileName: job.fileName,
    total: job.total,
    accepted: job.accepted,
    skipped: job.skipped,
    processed,
    percent,
    phase,
    lastError: job.lastError,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ProfileImportService implements OnModuleInit {
  private readonly logger = new Logger(ProfileImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: ProfileImportGamesService,
    private readonly media: ProfileImportMediaService,
  ) {}

  async onModuleInit() {
    const result = await this.prisma.importJob.updateMany({
      where: { status: "running", source: PROFILE_IMPORT_SOURCE },
      data: {
        status: "failed",
        lastError: "Interrupted by API restart",
        completedAt: new Date(),
      },
    });
    if (result.count > 0) {
      this.logger.warn(
        `Marked ${result.count} interrupted profile import(s) as failed`,
      );
    }
    try {
      await ensureImportJobRunningLock(this.prisma);
    } catch (err) {
      this.logger.warn(`Could not ensure profile import running lock: ${err}`);
    }
  }

  async getActive(userId: string): Promise<ProfileImportJob | null> {
    const job = await this.prisma.importJob.findFirst({
      where: { userId, source: PROFILE_IMPORT_SOURCE },
      orderBy: { createdAt: "desc" },
    });
    return job ? serializeJob(job) : null;
  }

  async startImport(userId: string, filePath: string, fileName: string) {
    const active = await this.prisma.importJob.findFirst({
      where: {
        userId,
        status: "running",
        source: PROFILE_IMPORT_SOURCE,
      },
    });
    if (active) {
      await rm(filePath, { force: true }).catch(() => {});
      throw new ConflictException("A profile import is already in progress");
    }

    let job;
    try {
      job = await this.prisma.importJob.create({
        data: {
          userId,
          source: PROFILE_IMPORT_SOURCE,
          status: "running",
          fileName,
        },
      });
    } catch (err) {
      await rm(filePath, { force: true }).catch(() => {});
      if (isPrismaAdmissionConflict(err)) {
        throw new ConflictException("A profile import is already in progress");
      }
      throw err;
    }

    void this.run(job.id, userId, filePath).catch((err) => {
      this.logger.error(`Profile import ${job.id} failed: ${err}`);
    });

    return serializeJob(job);
  }

  private async run(jobId: string, userId: string, filePath: string) {
    try {
      const buffer = await readFile(filePath);
      const jsonText = unzipProfileArchiveJson(buffer);
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch {
        throw new BadRequestException("Profile JSON is not valid");
      }
      const parsed = QuestoryProfileArchiveSchema.safeParse(parsedJson);
      if (!parsed.success) {
        throw new BadRequestException("Not a Questory profile export");
      }
      const archive = parsed.data;
      const total =
        archive.library.length +
        archive.wishlistTargets.length +
        archive.purchases.length +
        archive.collections.reduce((n, c) => n + c.items.length, 0) +
        archive.playSessions.length +
        archive.playSessionRules.length +
        (archive.family?.members.length ?? 0) +
        archive.music.rules.length +
        archive.music.labels.length +
        archive.music.listens.length +
        archive.watch.events.length +
        archive.watch.listStates.length +
        archive.read.events.length +
        archive.read.listStates.length;
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { total },
      });

      await this.games.applyProfile(userId, archive);
      const parts = [
        await this.games.applyLibrary(userId, archive),
        await this.games.applyWishlist(userId, archive),
        await this.games.applyPurchases(userId, archive),
        await this.games.applyCollections(userId, archive),
        await this.games.applyPlaySessionRules(userId, archive),
        await this.games.applyPlaySessions(userId, archive),
        await this.games.applyFamily(userId, archive),
        await this.media.applyMusic(userId, archive),
        await this.media.applyWatch(userId, archive),
        await this.media.applyRead(userId, archive),
      ];
      const accepted = parts.reduce((n, p) => n + p.accepted, 0);
      const skipped = parts.reduce((n, p) => n + p.skipped, 0);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          accepted,
          skipped,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? (err.message as string)
          : err instanceof Error
            ? err.message
            : String(err);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          lastError: message,
          completedAt: new Date(),
        },
      });
    } finally {
      await rm(filePath, { force: true }).catch(() => {});
    }
  }
}
