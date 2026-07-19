import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private queue: string[] = [];
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  enqueueTrack(trackId: string) {
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

  private async enrichTrack(trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: { artist: true, release: true },
    });
    if (!track) return;

    const fresh =
      track.metadataSyncedAt &&
      Date.now() - track.metadataSyncedAt.getTime() < FRESH_MS;
    if (fresh) return;

    const job = await this.prisma.enrichmentJob.create({
      data: { trackId, status: "running", attempts: 1 },
    });

    try {
      const tags: string[] = [];
      let imageUrl: string | null = null;

      if (track.recordingMbid) {
        const recording = await this.fetchMbJson(
          `https://musicbrainz.org/ws/2/recording/${track.recordingMbid}?inc=tags+releases&fmt=json`,
        );
        if (recording) {
          for (const t of recording.tags || []) {
            if (typeof t?.name === "string") tags.push(t.name);
          }
          const releaseId =
            recording.releases?.[0]?.id || track.release?.mbid || null;
          if (releaseId) {
            imageUrl = await this.fetchCoverArt(releaseId);
          }
        }
      }

      if (track.artist.mbid) {
        const artist = await this.fetchMbJson(
          `https://musicbrainz.org/ws/2/artist/${track.artist.mbid}?inc=tags&fmt=json`,
        );
        if (artist?.tags) {
          for (const t of artist.tags) {
            if (typeof t?.name === "string") tags.push(t.name);
          }
        }
      }

      if (tags.length) {
        await this.catalog.linkTags(track.id, tags, "musicbrainz");
      }

      await this.prisma.track.update({
        where: { id: track.id },
        data: { metadataSyncedAt: new Date() },
      });

      if (imageUrl && track.releaseId) {
        await this.prisma.release.update({
          where: { id: track.releaseId },
          data: { imageUrl, metadataSyncedAt: new Date() },
        });
      }

      await this.prisma.enrichmentJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date() },
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
      "QuestoryLabs-Music/0.1 (https://github.com/santoshpanna/steamdash)"
    );
  }

  private async fetchMbJson(url: string): Promise<any | null> {
    const res = await fetch(url, {
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
      const res = await fetch(
        `https://coverartarchive.org/release/${releaseMbid}`,
        {
          headers: { "User-Agent": this.userAgent() },
          redirect: "follow",
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        images?: { front?: boolean; image?: string; thumbnails?: { small?: string } }[];
      };
      const front =
        data.images?.find((i) => i.front) || data.images?.[0] || null;
      return front?.thumbnails?.small || front?.image || null;
    } catch {
      return null;
    }
  }
}
