import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import {
  assessEnrichmentGaps,
  hasEnrichmentGaps,
  needsEnrichment,
} from "./enrichment-gaps";
import {
  pickBestRelease,
  yearFromRelease,
} from "./mb-metadata";
import { providerFetch } from "../../lib/qhttp-outbound";

@Injectable()
export class EnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentService.name);
  private queue: string[] = [];
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async onModuleInit() {
    const pending = await this.prisma.enrichmentJob.findMany({
      where: { status: "pending" },
      select: { trackId: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });
    for (const row of pending) {
      if (!this.queue.includes(row.trackId)) {
        this.queue.push(row.trackId);
      }
    }
    if (pending.length) {
      this.logger.log(`Resumed ${pending.length} pending enrichment job(s)`);
    }
    // Backfill catalog rows that never got an enrichment attempt (e.g. import
    // while the music service failed to recompile).
    const enqueued = await this.enqueueIncompleteCatalog(5000);
    if (enqueued > 0) {
      this.logger.log(`Queued ${enqueued} track(s) missing enrichment data`);
    }
    void this.drain();
  }

  /**
   * True when the track has an MBID, is missing tags/year/cover, and has not
   * been attempted within the fresh window.
   */
  async trackNeedsEnrichment(trackId: string): Promise<boolean> {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: {
        recordingMbid: true,
        metadataSyncedAt: true,
        artist: { select: { mbid: true } },
        release: { select: { year: true, imageUrl: true } },
        _count: { select: { genres: true } },
      },
    });
    if (!track) return false;
    return needsEnrichment(
      assessEnrichmentGaps({
        recordingMbid: track.recordingMbid,
        artistMbid: track.artist.mbid,
        genreCount: track._count.genres,
        metadataSyncedAt: track.metadataSyncedAt,
        release: track.release,
      }),
    );
  }

  /**
   * Enqueue catalog tracks that still need enrichment (never attempted or stale).
   * Returns how many new queue entries were added.
   */
  async enqueueIncompleteCatalog(limit = 5000): Promise<number> {
    const candidates = await this.prisma.track.findMany({
      where: {
        metadataSyncedAt: null,
        OR: [
          { recordingMbid: { not: null } },
          { artist: { mbid: { not: null } } },
        ],
      },
      select: {
        id: true,
        recordingMbid: true,
        metadataSyncedAt: true,
        artist: { select: { mbid: true } },
        release: { select: { year: true, imageUrl: true } },
        _count: { select: { genres: true } },
      },
      take: limit,
    });

    let n = 0;
    for (const track of candidates) {
      const gaps = assessEnrichmentGaps({
        recordingMbid: track.recordingMbid,
        artistMbid: track.artist.mbid,
        genreCount: track._count.genres,
        metadataSyncedAt: track.metadataSyncedAt,
        release: track.release,
      });
      if (!needsEnrichment(gaps)) continue;
      await this.enqueueTrack(track.id);
      n += 1;
    }
    return n;
  }

  async enqueueTrack(trackId: string) {
    const existing = await this.prisma.enrichmentJob.findFirst({
      where: {
        trackId,
        status: { in: ["pending", "running"] },
      },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.enrichmentJob.create({
        data: { trackId, status: "pending", attempts: 0 },
      });
    }
    if (!this.queue.includes(trackId)) {
      this.queue.push(trackId);
    }
    void this.drain();
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const trackId = this.queue.shift();
        if (!trackId) continue;
        try {
          await this.enrichTrack(trackId);
        } catch (err) {
          this.logger.warn(
            `Enrichment failed for ${trackId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        // MusicBrainz courtesy rate limit (~1 req/s)
        await new Promise((r) => setTimeout(r, 1100));
      }
    } finally {
      this.running = false;
    }
  }

  private async claimJob(trackId: string) {
    const pending = await this.prisma.enrichmentJob.findFirst({
      where: { trackId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (pending) {
      return this.prisma.enrichmentJob.update({
        where: { id: pending.id },
        data: { status: "running", attempts: { increment: 1 } },
      });
    }
    return this.prisma.enrichmentJob.create({
      data: { trackId, status: "running", attempts: 1 },
    });
  }

  private async enrichTrack(trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: true,
        release: true,
        _count: { select: { genres: true } },
      },
    });
    if (!track) {
      await this.prisma.enrichmentJob.updateMany({
        where: { trackId, status: { in: ["pending", "running"] } },
        data: {
          status: "failed",
          lastError: "Track not found",
          completedAt: new Date(),
        },
      });
      return;
    }

    const gaps = assessEnrichmentGaps({
      recordingMbid: track.recordingMbid,
      artistMbid: track.artist.mbid,
      genreCount: track._count.genres,
      metadataSyncedAt: track.metadataSyncedAt,
      release: track.release
        ? { year: track.release.year, imageUrl: track.release.imageUrl }
        : null,
    });

    if (!gaps.hasMbid) {
      await this.prisma.enrichmentJob.updateMany({
        where: { trackId, status: { in: ["pending", "running"] } },
        data: {
          status: "completed",
          completedAt: new Date(),
          lastError: "No MusicBrainz IDs to enrich",
        },
      });
      return;
    }

    // Recently attempted (even if MB returned nothing) — don't hammer the API.
    if (gaps.recentlyAttempted) {
      await this.prisma.enrichmentJob.updateMany({
        where: { trackId, status: { in: ["pending", "running"] } },
        data: { status: "completed", completedAt: new Date() },
      });
      return;
    }

    // Already complete — nothing to fetch.
    if (!hasEnrichmentGaps(gaps)) {
      await this.prisma.enrichmentJob.updateMany({
        where: { trackId, status: { in: ["pending", "running"] } },
        data: { status: "completed", completedAt: new Date() },
      });
      return;
    }

    const job = await this.claimJob(trackId);

    try {
      const trackTags: string[] = [];
      const artistTags: string[] = [];
      let imageUrl: string | null = null;
      let releaseMbid: string | null = track.release?.mbid ?? null;
      let year: number | null = null;

      if (track.recordingMbid) {
        const recording = await this.fetchMbJson(
          `https://musicbrainz.org/ws/2/recording/${track.recordingMbid}?inc=tags+releases&fmt=json`,
        );
        if (recording) {
          for (const t of recording.tags || []) {
            if (typeof t?.name === "string") trackTags.push(t.name);
          }
          const best = pickBestRelease(recording.releases);
          if (best?.id) {
            releaseMbid = best.id;
            year = yearFromRelease(best);
          }
        }
      }

      if (releaseMbid) {
        const release = await this.fetchMbJson(
          `https://musicbrainz.org/ws/2/release/${releaseMbid}?fmt=json`,
        );
        if (release) {
          year = yearFromRelease(release) ?? year;
        }
        imageUrl = await this.fetchCoverArt(releaseMbid);
      }

      if (track.artist.mbid) {
        const artist = await this.fetchMbJson(
          `https://musicbrainz.org/ws/2/artist/${track.artist.mbid}?inc=tags&fmt=json`,
        );
        if (artist?.tags) {
          for (const t of artist.tags) {
            if (typeof t?.name === "string") artistTags.push(t.name);
          }
        }
      }

      const allTrackTags = [...trackTags, ...artistTags];
      if (allTrackTags.length) {
        await this.catalog.linkTags(track.id, allTrackTags, "musicbrainz");
      }
      if (artistTags.length) {
        await this.catalog.linkArtistTags(
          track.artistId,
          artistTags,
          "musicbrainz",
        );
      }

      await this.prisma.track.update({
        where: { id: track.id },
        data: { metadataSyncedAt: new Date() },
      });

      if (track.releaseId) {
        const release = await this.prisma.release.findUnique({
          where: { id: track.releaseId },
          select: { mbid: true, imageManual: true },
        });
        await this.prisma.release.update({
          where: { id: track.releaseId },
          data: {
            metadataSyncedAt: new Date(),
            ...(!release?.imageManual && imageUrl ? { imageUrl } : {}),
            ...(year != null ? { year } : {}),
            ...(releaseMbid && !release?.mbid ? { mbid: releaseMbid } : {}),
          },
        });
      }

      await this.prisma.enrichmentJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date(), lastError: null },
      });
    } catch (err) {
      await this.prisma.enrichmentJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  private userAgent() {
    return (
      process.env.MUSICBRAINZ_USER_AGENT ||
      "QuestoryLabs-Music/0.1 (https://github.com/Questory-Labs/Questory)"
    );
  }

  private async fetchMbJson(url: string): Promise<any | null> {
    const res = await providerFetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent(),
      },
    });
    if (!res.ok) {
      this.logger.debug(`MB ${res.status} for ${url}`);
      return null;
    }
    return res.json();
  }

  private async fetchCoverArt(releaseMbid: string): Promise<string | null> {
    try {
      const res = await providerFetch(
        `https://coverartarchive.org/release/${releaseMbid}`,
        {
          headers: { "User-Agent": this.userAgent() },
          redirect: "follow",
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        images?: {
          front?: boolean;
          image?: string;
          thumbnails?: { small?: string };
        }[];
      };
      const front =
        data.images?.find((i) => i.front) || data.images?.[0] || null;
      return front?.thumbnails?.small || front?.image || null;
    } catch {
      return null;
    }
  }
}
