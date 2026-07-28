import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../../cache/cache.service";
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

/**
 * Live now-playing via Redis write-through cache.
 * Applied inline (not BullMQ) so track changes stay ordered; Redis TTL is the
 * live window — once multi-scrobbler stops pinging, now-playing clears quickly.
 */
@Injectable()
export class PlayingNowService {
  private readonly logger = new Logger(PlayingNowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
  ) {
    this.logger.log(
      `PlayingNow: Redis cache TTL ${PLAYING_NOW_CACHE_TTL_SECONDS}s (inline apply)`,
    );
  }

  /** Accept a playing_now submit — sync apply + Redis refresh. */
  async submit(userId: string, meta: IncomingListenMeta): Promise<void> {
    await this.apply(userId, meta);
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

  /**
   * Prefer Redis. Prisma only within the same short live window — do not
   * resurrect a track for 15 minutes after playback stopped.
   */
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
    if (ageMs > PLAYING_NOW_STALE_MS) {
      // Expired live window — drop durable row so it cannot linger.
      await this.clear(userId);
      return null;
    }

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

    const ttlSec = Math.max(
      15,
      Math.floor((PLAYING_NOW_STALE_MS - ageMs) / 1000),
    );
    await this.cache.setJson(playingNowCacheKey(userId), snapshot, ttlSec);
    return snapshot;
  }
}
