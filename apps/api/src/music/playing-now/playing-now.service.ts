import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { CacheService } from "../../cache/cache.service";
import { resolveSyncMode } from "../../lib/runtime-config";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CatalogService,
  type IncomingListenMeta,
} from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import {
  PLAYING_NOW_CACHE_TTL_SECONDS,
  PLAYING_NOW_STALE_MS,
  playingNowCacheKey,
  toPlayingNowSnapshot,
  type PlayingNowSnapshot,
} from "./playing-now.types";

type PlayingNowJobData = {
  userId: string;
  meta: IncomingListenMeta;
};

/**
 * Keeps PlayingNow fresh via Redis BullMQ (same mode as steam-sync) with
 * write-through cache. Falls back to inline processing when Redis is off.
 */
@Injectable()
export class PlayingNowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlayingNowService.name);
  private queue!: Queue<PlayingNowJobData>;
  private worker!: Worker<PlayingNowJobData>;
  private inlineMode = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
  ) {}

  async onModuleInit() {
    const mode = resolveSyncMode();
    if (mode === "inline") {
      this.inlineMode = true;
      this.logger.log(
        "PlayingNow: inline (REDIS_URL unset or USE_INLINE_SYNC=true)",
      );
      return;
    }

    const redisUrl = process.env.REDIS_URL!.trim();
    try {
      const connection = { url: redisUrl };
      this.queue = new Queue<PlayingNowJobData>("music-playing-now", {
        connection,
      });
      this.worker = new Worker<PlayingNowJobData>(
        "music-playing-now",
        async (job) => this.apply(job.data.userId, job.data.meta),
        { connection, concurrency: 4 },
      );
      this.worker.on("failed", (job, err) => {
        this.logger.error(
          `PlayingNow job ${job?.id} failed: ${err.message}`,
        );
      });
      await this.queue.waitUntilReady();
      this.inlineMode = false;
      this.logger.log("PlayingNow: BullMQ via Redis");
    } catch (err) {
      this.logger.warn(`PlayingNow BullMQ unavailable, inline: ${err}`);
      this.inlineMode = true;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  /** Accept a playing_now submit — queue when Redis MQ is up, else inline. */
  async submit(userId: string, meta: IncomingListenMeta): Promise<void> {
    if (this.inlineMode) {
      await this.apply(userId, meta);
      return;
    }
    await this.queue.add(
      "set",
      {
        userId,
        meta: {
          ...meta,
          listenedAt:
            meta.listenedAt instanceof Date
              ? meta.listenedAt.toISOString()
              : meta.listenedAt,
        } as unknown as IncomingListenMeta,
      },
      {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  async apply(userId: string, meta: IncomingListenMeta): Promise<void> {
    const normalized: IncomingListenMeta = {
      ...meta,
      listenedAt:
        meta.listenedAt instanceof Date
          ? meta.listenedAt
          : new Date(meta.listenedAt as unknown as string),
    };
    const result = await this.catalog.setPlayingNow(userId, normalized);
    void this.enrichment.enqueueTrack(result.track.id);

    const snapshot = toPlayingNowSnapshot({
      updatedAt: new Date(),
      track: {
        id: result.track.id,
        title: result.track.title,
        artistId: result.artist.id,
        artistName: result.artist.name,
        releaseId: result.release?.id ?? null,
        releaseTitle: result.release?.title ?? null,
        imageUrl: result.release?.imageUrl ?? null,
      },
    });
    await this.cache.setJson(
      playingNowCacheKey(userId),
      snapshot,
      PLAYING_NOW_CACHE_TTL_SECONDS,
    );
  }

  async clear(userId: string): Promise<void> {
    await this.catalog.clearPlayingNow(userId);
    await this.cache.del(playingNowCacheKey(userId));
  }

  /** Prefer Redis snapshot; fall back to Prisma with stale window. */
  async getSnapshot(userId: string): Promise<PlayingNowSnapshot | null> {
    const cached = await this.cache.getJson<PlayingNowSnapshot>(
      playingNowCacheKey(userId),
    );
    if (cached?.track?.id) {
      return cached;
    }

    const row = await this.prisma.playingNow.findUnique({
      where: { userId },
      include: {
        track: {
          include: {
            artist: true,
            release: true,
          },
        },
      },
    });
    if (!row) return null;

    const ageMs = Date.now() - row.updatedAt.getTime();
    if (ageMs > PLAYING_NOW_STALE_MS) return null;

    const snapshot = toPlayingNowSnapshot({
      updatedAt: row.updatedAt,
      track: {
        id: row.track.id,
        title: row.track.title,
        artistId: row.track.artist.id,
        artistName: row.track.artist.name,
        releaseId: row.track.release?.id ?? null,
        releaseTitle: row.track.release?.title ?? null,
        imageUrl: row.track.release?.imageUrl ?? null,
      },
    });

    // Warm cache for subsequent polls (remaining freshness ≈ stale window).
    const ttlSec = Math.max(
      30,
      Math.min(
        PLAYING_NOW_CACHE_TTL_SECONDS,
        Math.floor((PLAYING_NOW_STALE_MS - ageMs) / 1000),
      ),
    );
    await this.cache.setJson(playingNowCacheKey(userId), snapshot, ttlSec);
    return snapshot;
  }
}
