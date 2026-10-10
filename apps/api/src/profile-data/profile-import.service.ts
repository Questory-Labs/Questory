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
import {
  PROFILE_IMPORT_PROGRESS_FLUSH_MS,
  PROFILE_IMPORT_SOURCE,
} from "./profile-data.constants";
import {
  ensureImportJobRunningLock,
  isPrismaAdmissionConflict,
} from "./profile-data.locks";
import { unzipProfileArchiveJson } from "./profile-zip";
import { ProfileImportGamesService } from "./profile-import-games.service";
import { ProfileImportMediaService } from "./profile-import-media.service";
import { ImportProgress } from "./profile-import-progress";

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

/**
 * Periodically persists running counts so `/import/active` shows live progress.
 * Only touches jobs still `running`, so a late flush never clobbers the final row.
 */
class ImportProgressFlusher {
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private lastProcessed = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobId: string,
    private readonly progress: ImportProgress,
  ) {}

  start() {
    this.timer = setInterval(() => {
      if (this.inFlight) return;
      this.inFlight = this.flush().finally(() => {
        this.inFlight = null;
      });
    }, PROFILE_IMPORT_PROGRESS_FLUSH_MS);
    this.timer.unref?.();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.inFlight;
  }

  private async flush() {
    const { accepted, skipped } = this.progress;
    if (accepted + skipped === this.lastProcessed) return;
    this.lastProcessed = accepted + skipped;
    await this.prisma.importJob
      .updateMany({
        where: { id: this.jobId, status: "running" },
        data: { accepted, skipped },
      })
      .catch(() => {});
  }
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
    const progress = new ImportProgress();
    const flusher = new ImportProgressFlusher(this.prisma, jobId, progress);
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

      flusher.start();
      await this.games.applyProfile(userId, archive);
      await this.games.applyLibrary(userId, archive, progress);
      await this.games.applyWishlist(userId, archive, progress);
      await this.games.applyPurchases(userId, archive, progress);
      await this.games.applyCollections(userId, archive, progress);
      await this.games.applyPlaySessionRules(userId, archive, progress);
      await this.games.applyPlaySessions(userId, archive, progress);
      await this.games.applyFamily(userId, archive, progress);
      await this.media.applyMusic(userId, archive, progress);
      await this.media.applyWatch(userId, archive, progress);
      await this.media.applyRead(userId, archive, progress);
      await flusher.stop();
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          accepted: progress.accepted,
          skipped: progress.skipped,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      await flusher.stop();
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
          accepted: progress.accepted,
          skipped: progress.skipped,
          lastError: message,
          completedAt: new Date(),
        },
      });
    } finally {
      await rm(filePath, { force: true }).catch(() => {});
    }
  }
}
