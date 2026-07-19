import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hourStartUtc, normalizeName, slugifyGenre } from "../lib/tokens";

export type IncomingListenMeta = {
  artistName: string;
  trackName: string;
  releaseName?: string | null;
  listenedAt: Date;
  listenType: string;
  recordingMbid?: string | null;
  trackMbid?: string | null;
  releaseMbid?: string | null;
  artistMbids?: string[];
  isrc?: string | null;
  spotifyId?: string | null;
  durationMs?: number | null;
  tags?: string[];
  mediaPlayer?: string | null;
  submissionClient?: string | null;
  musicService?: string | null;
  rawPayload?: string | null;
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertListen(userId: string, meta: IncomingListenMeta) {
    const artist = await this.upsertArtist(
      meta.artistName,
      meta.artistMbids?.[0] ?? null,
    );
    const release = meta.releaseName
      ? await this.upsertRelease(
          meta.releaseName,
          artist.id,
          meta.releaseMbid ?? null,
        )
      : null;

    const track = await this.upsertTrack({
      title: meta.trackName,
      artistId: artist.id,
      releaseId: release?.id ?? null,
      recordingMbid: meta.recordingMbid ?? null,
      trackMbid: meta.trackMbid ?? null,
      isrc: meta.isrc ?? null,
      spotifyId: meta.spotifyId ?? null,
      durationMs: meta.durationMs ?? null,
    });

    if (meta.tags?.length) {
      await this.linkTags(track.id, meta.tags, "payload_tag");
    }

    const listen = await this.prisma.listen.upsert({
      where: {
        userId_trackId_listenedAt: {
          userId,
          trackId: track.id,
          listenedAt: meta.listenedAt,
        },
      },
      create: {
        userId,
        trackId: track.id,
        listenedAt: meta.listenedAt,
        listenType: meta.listenType,
        mediaPlayer: meta.mediaPlayer ?? null,
        submissionClient: meta.submissionClient ?? null,
        musicService: meta.musicService ?? null,
        rawPayload: meta.rawPayload ?? null,
      },
      update: {
        listenType: meta.listenType,
        mediaPlayer: meta.mediaPlayer ?? null,
        submissionClient: meta.submissionClient ?? null,
        musicService: meta.musicService ?? null,
      },
    });

    await this.bumpHourBucket(userId, meta.listenedAt);
    return { listen, track, artist, release };
  }

  async setPlayingNow(userId: string, meta: IncomingListenMeta) {
    const artist = await this.upsertArtist(
      meta.artistName,
      meta.artistMbids?.[0] ?? null,
    );
    const release = meta.releaseName
      ? await this.upsertRelease(
          meta.releaseName,
          artist.id,
          meta.releaseMbid ?? null,
        )
      : null;
    const track = await this.upsertTrack({
      title: meta.trackName,
      artistId: artist.id,
      releaseId: release?.id ?? null,
      recordingMbid: meta.recordingMbid ?? null,
      trackMbid: meta.trackMbid ?? null,
      isrc: meta.isrc ?? null,
      spotifyId: meta.spotifyId ?? null,
      durationMs: meta.durationMs ?? null,
    });

    if (meta.tags?.length) {
      await this.linkTags(track.id, meta.tags, "payload_tag");
    }

    await this.prisma.playingNow.upsert({
      where: { userId },
      create: { userId, trackId: track.id },
      update: { trackId: track.id },
    });

    return { track, artist, release };
  }

  async clearPlayingNow(userId: string) {
    await this.prisma.playingNow.deleteMany({ where: { userId } });
  }

  async linkTags(trackId: string, tags: string[], source: string) {
    for (const raw of tags) {
      const name = raw.trim();
      if (!name) continue;
      const slug = slugifyGenre(name) || normalizeName(name).replace(/\s/g, "-");
      if (!slug) continue;

      const genre = await this.prisma.genre.upsert({
        where: { slug },
        create: { name, slug },
        update: { name },
      });

      await this.prisma.trackGenre.upsert({
        where: {
          trackId_genreId_source: { trackId, genreId: genre.id, source },
        },
        create: { trackId, genreId: genre.id, source },
        update: {},
      });
    }
  }

  private async upsertArtist(name: string, mbid: string | null) {
    const nameNormalized = normalizeName(name);
    if (mbid) {
      const byMbid = await this.prisma.artist.findFirst({ where: { mbid } });
      if (byMbid) {
        if (byMbid.nameNormalized !== nameNormalized) {
          return this.prisma.artist.update({
            where: { id: byMbid.id },
            data: { name, nameNormalized },
          });
        }
        return byMbid;
      }
    }

    const existing = await this.prisma.artist.findFirst({
      where: { nameNormalized, mbid: mbid ?? null },
    });
    if (existing) return existing;

    return this.prisma.artist.create({
      data: { name, nameNormalized, mbid },
    });
  }

  private async upsertRelease(
    title: string,
    artistId: string,
    mbid: string | null,
  ) {
    const titleNormalized = normalizeName(title);
    if (mbid) {
      const byMbid = await this.prisma.release.findFirst({ where: { mbid } });
      if (byMbid) return byMbid;
    }

    const existing = await this.prisma.release.findFirst({
      where: { titleNormalized, artistId },
    });
    if (existing) {
      if (mbid && !existing.mbid) {
        return this.prisma.release.update({
          where: { id: existing.id },
          data: { mbid },
        });
      }
      return existing;
    }

    return this.prisma.release.create({
      data: { title, titleNormalized, artistId, mbid },
    });
  }

  private async upsertTrack(input: {
    title: string;
    artistId: string;
    releaseId: string | null;
    recordingMbid: string | null;
    trackMbid: string | null;
    isrc: string | null;
    spotifyId: string | null;
    durationMs: number | null;
  }) {
    const titleNormalized = normalizeName(input.title);

    if (input.recordingMbid) {
      const byMbid = await this.prisma.track.findFirst({
        where: { recordingMbid: input.recordingMbid },
      });
      if (byMbid) {
        return this.prisma.track.update({
          where: { id: byMbid.id },
          data: {
            releaseId: input.releaseId ?? byMbid.releaseId,
            spotifyId: input.spotifyId ?? byMbid.spotifyId,
            isrc: input.isrc ?? byMbid.isrc,
            durationMs: input.durationMs ?? byMbid.durationMs,
            trackMbid: input.trackMbid ?? byMbid.trackMbid,
          },
        });
      }
    }

    if (input.spotifyId) {
      const bySpotify = await this.prisma.track.findFirst({
        where: { spotifyId: input.spotifyId },
      });
      if (bySpotify) return bySpotify;
    }

    const existing = await this.prisma.track.findFirst({
      where: {
        titleNormalized,
        artistId: input.artistId,
        releaseId: input.releaseId,
      },
    });
    if (existing) {
      return this.prisma.track.update({
        where: { id: existing.id },
        data: {
          recordingMbid: input.recordingMbid ?? existing.recordingMbid,
          trackMbid: input.trackMbid ?? existing.trackMbid,
          isrc: input.isrc ?? existing.isrc,
          spotifyId: input.spotifyId ?? existing.spotifyId,
          durationMs: input.durationMs ?? existing.durationMs,
        },
      });
    }

    return this.prisma.track.create({
      data: {
        title: input.title,
        titleNormalized,
        artistId: input.artistId,
        releaseId: input.releaseId,
        recordingMbid: input.recordingMbid,
        trackMbid: input.trackMbid,
        isrc: input.isrc,
        spotifyId: input.spotifyId,
        durationMs: input.durationMs,
      },
    });
  }

  private async bumpHourBucket(userId: string, listenedAt: Date) {
    const hourStart = hourStartUtc(listenedAt);
    await this.prisma.listenHourBucket.upsert({
      where: { userId_hourStart: { userId, hourStart } },
      create: { userId, hourStart, listenCount: 1 },
      update: { listenCount: { increment: 1 } },
    });
  }
}
