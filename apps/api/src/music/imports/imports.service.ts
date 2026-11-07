import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { mkdir, rename, rm } from "fs/promises";
import { dirname, join } from "path";
import {
  CatalogService,
  createImportEntityCache,
} from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { isPrismaAdmissionConflict } from "../../profile-data/profile-data.locks";
import { UsersService } from "../users/users.service";
import { FeatureFlagsService } from "../../features/feature-flags.service";
import { resolveDbProvider } from "../lib/runtime-config";
import { parseImportInWorker } from "./parse-in-worker";
import { detectImportSourceFromPath } from "./parsers/detect";
import {
  ImportParseError,
  isFsError,
  type ImportSource,
} from "./parsers/types";
import { resolveRepoTempDir } from "./temp-dir";

const PROGRESS_EVERY = 25;
const YIELD_EVERY = 10;

/** ImportJob.source values owned by music (not Letterboxd / watch). */
const MUSIC_IMPORT_SOURCES: ImportSource[] = [
  "koito_db",
  "koito_json",
  "spotify_json",
  "maloja_json",
  "lastfm_json",
  "listenbrainz_zip",
];

function yieldEventLoop() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

function importInProgress(jobId?: string) {
  return new ConflictException({
    statusCode: 409,
    error: "Conflict",
    message: "An import is already in progress",
    jobId,
  });
}

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
}) {
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
      : (job.status as "pending" | "completed" | "failed" | string);

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
export class ImportsService implements OnModuleInit {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async onModuleInit() {
    const result = await this.prisma.importJob.updateMany({
      where: { status: "running", source: { in: [...MUSIC_IMPORT_SOURCES] } },
      data: {
        status: "failed",
        lastError: "Interrupted by music service restart",
        completedAt: new Date(),
      },
    });
    if (result.count > 0) {
      this.logger.warn(
        `Marked ${result.count} interrupted import job(s) as failed`,
      );
    }
  }

  async startImport(
    uploadPath: string,
    fileName: string,
    userId: string,
    sourceOverride?: ImportSource,
  ) {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException("No user for import");

    const active = await this.findRunningJob(user.id);
    if (active) throw importInProgress(active.id);

    let source: ImportSource;
    try {
      source =
        sourceOverride ??
        (await detectImportSourceFromPath(fileName, uploadPath));
    } catch (err) {
      if (isFsError(err)) {
        this.logger.warn(`Failed to read upload: ${String(err)}`);
        throw new BadRequestException("Failed to read upload");
      }
      throw new BadRequestException(
        err instanceof Error ? err.message : "Unrecognized import file",
      );
    }
    if (source === "spotify_json") {
      await this.flags.assertSourceEnabled("spotify");
    }

    const job = await this.admitJob(user.id, source, fileName);

    const uploadDir = dirname(uploadPath);
    const stagingParent = join(resolveRepoTempDir(), "music-imports");
    const stagingDir = join(stagingParent, job.id);
    let stagedPath: string;
    try {
      await mkdir(stagingParent, { recursive: true });
      await rename(uploadDir, stagingDir);
      stagedPath = join(stagingDir, fileName || "import.bin");
    } catch (err) {
      await rm(uploadDir, { recursive: true, force: true }).catch(() => {});
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: "Failed to stage upload under temp/",
          completedAt: new Date(),
        },
      });
      this.logger.warn(`Failed to stage upload: ${String(err)}`);
      throw new BadRequestException("Failed to stage upload");
    }

    // Parse + upsert off the request path; worker keeps /health responsive.
    this.runJob(job.id, user.id, source, stagedPath, stagingDir, fileName).catch(
      (err) => {
        this.logger.error(`Import ${job.id} could not be finalized: ${String(err)}`);
      },
    );

    return {
      ok: true as const,
      jobId: job.id,
      ...serializeJob({
        id: job.id,
        source: job.source,
        status: "running",
        fileName: job.fileName,
        total: 0,
        accepted: 0,
        skipped: 0,
        lastError: null,
        createdAt: job.createdAt,
        completedAt: null,
      }),
    };
  }

  private findRunningJob(
    userId: string,
    client: Pick<Prisma.TransactionClient, "importJob"> = this.prisma,
  ) {
    return client.importJob.findFirst({
      where: {
        userId,
        status: "running",
        source: { in: [...MUSIC_IMPORT_SOURCES] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async admitJob(userId: string, source: ImportSource, fileName: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const active = await this.findRunningJob(userId, tx);
          if (active) throw importInProgress(active.id);
          return tx.importJob.create({
            data: {
              userId,
              source,
              status: "running",
              fileName: fileName || null,
            },
          });
        },
        resolveDbProvider() === "postgresql"
          ? { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
          : undefined,
      );
    } catch (err) {
      if (!isPrismaAdmissionConflict(err)) throw err;
      const winner = await this.findRunningJob(userId);
      throw importInProgress(winner?.id);
    }
  }

  async getActiveJob(userId: string) {
    const job = await this.findRunningJob(userId);
    return job ? serializeJob(job) : null;
  }

  async getJob(jobId: string, userId: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id: jobId, userId },
    });
    if (!job) throw new BadRequestException("Import job not found");
    return serializeJob(job);
  }

  private async queueEnrichment(trackId: string) {
    const logFailure = (err: unknown) => {
      this.logger.warn(`Enrichment failed for track ${trackId}: ${String(err)}`);
    };
    try {
      // Re-import of existing listens still fills gaps (tags/year/cover).
      if (await this.enrichment.trackNeedsEnrichment(trackId)) {
        void this.enrichment.enqueueTrack(trackId).catch(logFailure);
      }
    } catch (err) {
      logFailure(err);
    }
  }

  private async runJob(
    jobId: string,
    userId: string,
    source: ImportSource,
    stagedPath: string,
    stagingDir: string,
    fileName: string,
  ) {
    try {
      const listens = await parseImportInWorker(source, stagedPath);
      const total = listens.length;
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { total },
      });

      let accepted = 0;
      let skipped = 0;
      const cache = createImportEntityCache();
      /** Track ids already evaluated for enrichment this job (enqueue or skip). */
      const enrichmentChecked = new Set<string>();

      for (let i = 0; i < listens.length; i += 1) {
        const item = listens[i];
        try {
          const result = await this.catalog.upsertListen(
            userId,
            {
              artistName: item.artistName,
              trackName: item.trackName,
              releaseName: item.releaseName,
              listenedAt: item.listenedAt,
              listenType: "import",
              recordingMbid: item.recordingMbid,
              releaseMbid: item.releaseMbid,
              artistMbids: item.artistMbids,
              durationMs: item.durationMs,
              mediaPlayer: item.mediaPlayer,
              submissionClient: item.submissionClient,
              musicService: item.musicService,
            },
            cache,
          );
          if (result.created) accepted += 1;
          else skipped += 1;

          const hasMbid =
            Boolean(item.recordingMbid) || Boolean(item.artistMbids?.[0]);
          if (hasMbid && !enrichmentChecked.has(result.track.id)) {
            enrichmentChecked.add(result.track.id);
            await this.queueEnrichment(result.track.id);
          }
        } catch (err) {
          skipped += 1;
          this.logger.debug(
            `Skip listen from ${fileName}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        const processed = accepted + skipped;
        if (processed % PROGRESS_EVERY === 0 || processed === total) {
          await this.prisma.importJob.update({
            where: { id: jobId },
            data: { accepted, skipped },
          });
        }
        if (processed % YIELD_EVERY === 0) {
          await yieldEventLoop();
        }
      }

      // Safety net: enqueue any catalog gaps the per-listen path missed.
      const enrichQueued = await this.enrichment.enqueueIncompleteCatalog(5000);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          total,
          accepted,
          skipped,
          completedAt: new Date(),
        },
      });
      this.logger.log(
        `Import ${jobId} (${source}) finished: +${accepted} / skipped ${skipped} / total ${total} from ${fileName}` +
          (enrichQueued
            ? ` · queued ${enrichQueued} enrichment job(s)`
            : ""),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          lastError:
            err instanceof ImportParseError
              ? message.slice(0, 500)
              : "Import failed",
          completedAt: new Date(),
        },
      });
      this.logger.warn(`Import ${jobId} failed: ${message}`);
    } finally {
      await rm(stagingDir, { recursive: true, force: true }).catch((err) => {
        this.logger.warn(
          `Failed to delete staged import ${stagingDir}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }
  }
}
