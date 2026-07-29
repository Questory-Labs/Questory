import { Inject, Injectable, Logger, NotFoundException, OnModuleInit, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  classifyTagKind,
  type GenreKind,
} from "../enrichment/mb-metadata";
import { resolveMusicService, musicServiceFromRawPayload } from "../lib/music-service";
import { hourStartUtc, normalizeName, slugifyGenre } from "../lib/tokens";
import { CorrectionsService } from "../corrections/corrections.service";

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
  correctionArtistIds?: string[];
};

/** Per-import lookup cache to avoid repeat artist/release/track round-trips. */
export type ImportEntityCache = {
  artists: Map<string, { id: string }>;
  releases: Map<string, { id: string }>;
  tracks: Map<string, { id: string }>;
};

export function createImportEntityCache(): ImportEntityCache {
  return {
    artists: new Map(),
    releases: new Map(),
    tracks: new Map(),
  };
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CorrectionsService))
    private readonly corrections: CorrectionsService,
  ) {}

  async onModuleInit() {
    void this.backfillMusicServices().catch((err) =>
      this.logger.warn(`Music service backfill failed: ${String(err)}`),
    );
  }

  /** Fill musicService from submissionClient or stored raw payloads. */
  async backfillMusicServices(batchSize = 2000) {
    const fromSubmissionClient = await this.prisma.$executeRaw`
      UPDATE "Listen"
      SET "musicService" = trim("submissionClient")
      WHERE ("musicService" IS NULL OR trim("musicService") = '')
        AND "submissionClient" IS NOT NULL
        AND trim("submissionClient") <> ''
    `;

    let fromRawPayload = 0;
    let cursor: string | undefined;
    for (;;) {
      const rows = await this.prisma.listen.findMany({
        where: {
          OR: [{ musicService: null }, { musicService: "" }],
          rawPayload: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        take: batchSize,
        orderBy: { id: "asc" },
        select: { id: true, rawPayload: true },
      });
      if (!rows.length) break;
      cursor = rows[rows.length - 1].id;

      for (const row of rows) {
        const musicService = musicServiceFromRawPayload(row.rawPayload);
        if (!musicService) continue;
        await this.prisma.listen.update({
          where: { id: row.id },
          data: { musicService },
        });
        fromRawPayload += 1;
      }

      if (rows.length < batchSize) break;
    }

    if (fromSubmissionClient > 0 || fromRawPayload > 0) {
      this.logger.log(
        `Backfilled musicService on ${fromSubmissionClient} listens from submissionClient and ${fromRawPayload} from rawPayload`,
      );
    }
  }

  async upsertListen(
    userId: string,
    meta: IncomingListenMeta,
    cache?: ImportEntityCache,
  ) {
    meta = await this.corrections.applyRulesToMeta(userId, meta);
    meta.musicService = resolveMusicService(
      meta.musicService,
      meta.submissionClient,
    );

    if (meta.correctionArtistIds?.length) {
      const resolved = await this.resolveCorrectedTrack({
        artistIds: meta.correctionArtistIds,
        trackTitle: meta.trackName,
        albumTitle: meta.releaseName ?? null,
        albumId: null,
      });
      const track = { id: resolved.id };
      const artist = { id: meta.correctionArtistIds[0] };
      const release = resolved.releaseId ? { id: resolved.releaseId } : null;

      if (meta.tags?.length) {
        await this.linkTags(track.id, meta.tags, "payload_tag");
      }

      const existing = await this.prisma.listen.findUnique({
        where: {
          userId_trackId_listenedAt: {
            userId,
            trackId: track.id,
            listenedAt: meta.listenedAt,
          },
        },
      });

      if (existing) {
        const listen = await this.prisma.listen.update({
          where: { id: existing.id },
          data: {
            listenType: meta.listenType,
            mediaPlayer: meta.mediaPlayer ?? null,
            submissionClient: meta.submissionClient ?? null,
            musicService: meta.musicService ?? null,
          },
        });
        return { listen, track, artist, release, created: false as const };
      }

      const listen = await this.prisma.listen.create({
        data: {
          userId,
          trackId: track.id,
          listenedAt: meta.listenedAt,
          listenType: meta.listenType,
          mediaPlayer: meta.mediaPlayer ?? null,
          submissionClient: meta.submissionClient ?? null,
          musicService: meta.musicService ?? null,
          rawPayload: meta.rawPayload ?? null,
        },
      });

      await this.bumpHourBucket(userId, meta.listenedAt);
      return { listen, track, artist, release, created: true as const };
    }

    const artistMbid = meta.artistMbids?.[0] ?? null;
    const artistKey = `${normalizeName(meta.artistName)}|${artistMbid ?? ""}`;
    let artist = cache?.artists.get(artistKey);
    if (!artist) {
      artist = await this.upsertArtist(meta.artistName, artistMbid);
      cache?.artists.set(artistKey, { id: artist.id });
    }

    let release: { id: string } | null = null;
    if (meta.releaseName) {
      const releaseKey = `${normalizeName(meta.releaseName)}|${artist.id}|${meta.releaseMbid ?? ""}`;
      release = cache?.releases.get(releaseKey) ?? null;
      if (!release) {
        release = await this.upsertRelease(
          meta.releaseName,
          artist.id,
          meta.releaseMbid ?? null,
        );
        cache?.releases.set(releaseKey, { id: release.id });
      }
    }

    const trackKey = [
      normalizeName(meta.trackName),
      artist.id,
      release?.id ?? "",
      meta.recordingMbid ?? "",
      meta.spotifyId ?? "",
    ].join("|");
    let track = cache?.tracks.get(trackKey);
    if (!track) {
      track = await this.upsertTrack({
        title: meta.trackName,
        artistId: artist.id,
        releaseId: release?.id ?? null,
        recordingMbid: meta.recordingMbid ?? null,
        trackMbid: meta.trackMbid ?? null,
        isrc: meta.isrc ?? null,
        spotifyId: meta.spotifyId ?? null,
        durationMs: meta.durationMs ?? null,
      });
      cache?.tracks.set(trackKey, { id: track.id });
    }

    if (meta.tags?.length) {
      await this.linkTags(track.id, meta.tags, "payload_tag");
    }

    const existing = await this.prisma.listen.findUnique({
      where: {
        userId_trackId_listenedAt: {
          userId,
          trackId: track.id,
          listenedAt: meta.listenedAt,
        },
      },
    });

    if (existing) {
      const listen = await this.prisma.listen.update({
        where: { id: existing.id },
        data: {
          listenType: meta.listenType,
          mediaPlayer: meta.mediaPlayer ?? null,
          submissionClient: meta.submissionClient ?? null,
          musicService: meta.musicService ?? null,
        },
      });
      return { listen, track, artist, release, created: false as const };
    }

    const listen = await this.prisma.listen.create({
      data: {
        userId,
        trackId: track.id,
        listenedAt: meta.listenedAt,
        listenType: meta.listenType,
        mediaPlayer: meta.mediaPlayer ?? null,
        submissionClient: meta.submissionClient ?? null,
        musicService: meta.musicService ?? null,
        rawPayload: meta.rawPayload ?? null,
      },
    });

    await this.bumpHourBucket(userId, meta.listenedAt);
    return { listen, track, artist, release, created: true as const };
  }

  async setPlayingNow(userId: string, meta: IncomingListenMeta) {
    meta = await this.corrections.applyRulesToMeta(userId, meta);

    if (meta.correctionArtistIds?.length) {
      const resolved = await this.resolveCorrectedTrack({
        artistIds: meta.correctionArtistIds,
        trackTitle: meta.trackName,
        albumTitle: meta.releaseName ?? null,
        albumId: null,
      });
      const full = await this.prisma.track.findUnique({
        where: { id: resolved.id },
        include: { artist: true, release: true },
      });
      if (!full) throw new NotFoundException("Track not found");
      if (meta.tags?.length) {
        await this.linkTags(full.id, meta.tags, "payload_tag");
      }
      await this.prisma.playingNow.upsert({
        where: { userId },
        create: { userId, trackId: full.id },
        update: { trackId: full.id, updatedAt: new Date() },
      });
      return { track: full, artist: full.artist, release: full.release };
    }

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
      update: { trackId: track.id, updatedAt: new Date() },
    });

    return { track, artist, release };
  }

  async clearPlayingNow(userId: string) {
    await this.prisma.playingNow.deleteMany({ where: { userId } });
  }

  async linkTags(trackId: string, tags: string[], source: string) {
    for (const raw of tags) {
      const genre = await this.upsertGenreFromTag(raw);
      if (!genre) continue;

      await this.prisma.trackGenre.upsert({
        where: {
          trackId_genreId_source: { trackId, genreId: genre.id, source },
        },
        create: { trackId, genreId: genre.id, source },
        update: {},
      });
    }
  }

  async linkArtistTags(artistId: string, tags: string[], source: string) {
    for (const raw of tags) {
      const genre = await this.upsertGenreFromTag(raw);
      if (!genre) continue;

      await this.prisma.artistGenre.upsert({
        where: {
          artistId_genreId_source: { artistId, genreId: genre.id, source },
        },
        create: { artistId, genreId: genre.id, source },
        update: {},
      });
    }
  }

  private async upsertGenreFromTag(raw: string) {
    const name = raw.trim();
    if (!name) return null;
    const slug = slugifyGenre(name) || normalizeName(name).replace(/\s/g, "-");
    if (!slug) return null;

    const kind = classifyTagKind(name);
    const existing = await this.prisma.genre.findUnique({ where: { slug } });
    if (existing) {
      const nextKind = promoteGenreKind(existing.kind as GenreKind, kind);
      if (nextKind !== existing.kind || existing.name !== name) {
        return this.prisma.genre.update({
          where: { id: existing.id },
          data: { name, kind: nextKind },
        });
      }
      return existing;
    }

    return this.prisma.genre.create({
      data: { name, slug, kind },
    });
  }

  async upsertArtistPublic(name: string, mbid: string | null = null) {
    return this.upsertArtist(name, mbid);
  }

  async resolveCorrectedTrack(input: {
    artistIds: string[];
    trackTitle: string;
    albumTitle?: string | null;
    albumId?: string | null;
  }) {
    const primaryId = input.artistIds[0];
    if (!primaryId) {
      throw new NotFoundException("Primary artist is required");
    }

    let releaseId: string | null = input.albumId ?? null;
    if (!releaseId && input.albumTitle?.trim()) {
      const release = await this.upsertRelease(
        input.albumTitle.trim(),
        primaryId,
        null,
      );
      releaseId = release.id;
    }

    const track = await this.upsertTrack({
      title: input.trackTitle.trim(),
      artistId: primaryId,
      releaseId,
      recordingMbid: null,
      trackMbid: null,
      isrc: null,
      spotifyId: null,
      durationMs: null,
    });

    await this.syncTrackArtists(track.id, input.artistIds);
    return { id: track.id, releaseId };
  }

  async syncTrackArtists(trackId: string, artistIds: string[]) {
    const featured = artistIds.slice(1);
    await this.prisma.trackArtist.deleteMany({ where: { trackId } });
    for (let i = 0; i < featured.length; i++) {
      await this.prisma.trackArtist.create({
        data: { trackId, artistId: featured[i], position: i + 1 },
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

  private normalizeOptionalText(value: string | null | undefined) {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async updateArtist(
    id: string,
    input: { displayName?: string | null; imageUrl?: string | null },
  ) {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    if (!artist) throw new NotFoundException("Artist not found");

    const data: {
      displayName?: string | null;
      imageUrl?: string | null;
      imageManual?: boolean;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = this.normalizeOptionalText(input.displayName);
    }
    if (input.imageUrl !== undefined) {
      const url = this.normalizeOptionalText(input.imageUrl);
      data.imageUrl = url;
      data.imageManual = url != null;
    }

    return this.prisma.artist.update({ where: { id }, data });
  }

  async updateAlbum(
    id: string,
    input: { displayName?: string | null; imageUrl?: string | null },
  ) {
    const release = await this.prisma.release.findUnique({ where: { id } });
    if (!release) throw new NotFoundException("Album not found");

    const data: {
      displayName?: string | null;
      imageUrl?: string | null;
      imageManual?: boolean;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = this.normalizeOptionalText(input.displayName);
    }
    if (input.imageUrl !== undefined) {
      const url = this.normalizeOptionalText(input.imageUrl);
      data.imageUrl = url;
      data.imageManual = url != null;
    }

    return this.prisma.release.update({ where: { id }, data });
  }

  async updateTrack(
    id: string,
    input: { displayName?: string | null; imageUrl?: string | null },
  ) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: { release: true },
    });
    if (!track) throw new NotFoundException("Track not found");

    const data: { displayName?: string | null } = {};
    if (input.displayName !== undefined) {
      data.displayName = this.normalizeOptionalText(input.displayName);
    }

    const updated = await this.prisma.track.update({ where: { id }, data });

    if (input.imageUrl !== undefined && track.releaseId) {
      await this.updateAlbum(track.releaseId, { imageUrl: input.imageUrl });
    }

    return updated;
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

/** Prefer mood > genre > tag when re-classifying an existing Genre. */
function promoteGenreKind(current: GenreKind, next: GenreKind): GenreKind {
  if (current === "mood" || next === "mood") return "mood";
  if (current === "genre" || next === "genre") return "genre";
  return "tag";
}
