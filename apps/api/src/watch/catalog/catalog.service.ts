import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { hourStartUtc, normalizeName, slugify } from "../lib/normalize";

export type UpsertTitleInput = {
  type: "movie" | "show";
  name: string;
  year?: number | null;
  overview?: string | null;
  runtimeMinutes?: number | null;
  posterUrl?: string | null;
  traktId?: number | null;
  tmdbId?: number | null;
  imdbId?: string | null;
  anilistId?: number | null;
  malId?: number | null;
};

export type UpsertEpisodeInput = {
  titleId: string;
  seasonNumber: number;
  episodeNumber: number;
  name?: string | null;
  runtimeMinutes?: number | null;
  traktId?: number | null;
  tmdbId?: number | null;
};

export type RecordWatchInput = {
  userId: string;
  titleId: string;
  episodeId?: string | null;
  watchedAt: Date;
  source: string;
  dedupeKey: string;
  action?: string;
  progress?: number;
  rating?: number | null;
  runtimeMinutes?: number | null;
  precision?: string;
  rawPayload?: string | null;
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertTitle(input: UpsertTitleInput) {
    const nameNormalized = normalizeName(input.name);

    if (input.tmdbId != null) {
      const byTmdb = await this.prisma.title.findUnique({
        where: { type_tmdbId: { type: input.type, tmdbId: input.tmdbId } },
      });
      if (byTmdb) {
        return this.prisma.title.update({
          where: { id: byTmdb.id },
          data: {
            name: input.name,
            nameNormalized,
            year: input.year ?? byTmdb.year,
            overview: input.overview ?? byTmdb.overview,
            runtimeMinutes: input.runtimeMinutes ?? byTmdb.runtimeMinutes,
            posterUrl: input.posterUrl ?? byTmdb.posterUrl,
            traktId: input.traktId ?? byTmdb.traktId,
            imdbId: input.imdbId ?? byTmdb.imdbId,
            anilistId: input.anilistId ?? byTmdb.anilistId,
            malId: input.malId ?? byTmdb.malId,
          },
        });
      }
    }

    if (input.traktId != null) {
      const byTrakt = await this.prisma.title.findFirst({
        where: { type: input.type, traktId: input.traktId },
      });
      if (byTrakt) {
        return this.prisma.title.update({
          where: { id: byTrakt.id },
          data: {
            name: input.name,
            nameNormalized,
            year: input.year ?? byTrakt.year,
            tmdbId: input.tmdbId ?? byTrakt.tmdbId,
            imdbId: input.imdbId ?? byTrakt.imdbId,
            overview: input.overview ?? byTrakt.overview,
            runtimeMinutes: input.runtimeMinutes ?? byTrakt.runtimeMinutes,
            posterUrl: input.posterUrl ?? byTrakt.posterUrl,
          },
        });
      }
    }

    if (input.anilistId != null) {
      const byAni = await this.prisma.title.findFirst({
        where: { anilistId: input.anilistId },
      });
      if (byAni) {
        return this.prisma.title.update({
          where: { id: byAni.id },
          data: {
            name: input.name,
            nameNormalized,
            year: input.year ?? byAni.year,
            tmdbId: input.tmdbId ?? byAni.tmdbId,
            malId: input.malId ?? byAni.malId,
          },
        });
      }
    }

    const existing = await this.prisma.title.findFirst({
      where: {
        type: input.type,
        nameNormalized,
        year: input.year ?? undefined,
      },
    });
    if (existing) {
      return this.prisma.title.update({
        where: { id: existing.id },
        data: {
          traktId: input.traktId ?? existing.traktId,
          tmdbId: input.tmdbId ?? existing.tmdbId,
          imdbId: input.imdbId ?? existing.imdbId,
          anilistId: input.anilistId ?? existing.anilistId,
          malId: input.malId ?? existing.malId,
          overview: input.overview ?? existing.overview,
          runtimeMinutes: input.runtimeMinutes ?? existing.runtimeMinutes,
          posterUrl: input.posterUrl ?? existing.posterUrl,
        },
      });
    }

    return this.prisma.title.create({
      data: {
        type: input.type,
        name: input.name,
        nameNormalized,
        year: input.year ?? null,
        overview: input.overview ?? null,
        runtimeMinutes: input.runtimeMinutes ?? null,
        posterUrl: input.posterUrl ?? null,
        traktId: input.traktId ?? null,
        tmdbId: input.tmdbId ?? null,
        imdbId: input.imdbId ?? null,
        anilistId: input.anilistId ?? null,
        malId: input.malId ?? null,
      },
    });
  }

  async upsertEpisode(input: UpsertEpisodeInput) {
    const existing = await this.prisma.episode.findUnique({
      where: {
        titleId_seasonNumber_episodeNumber: {
          titleId: input.titleId,
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
        },
      },
    });
    if (existing) {
      return this.prisma.episode.update({
        where: { id: existing.id },
        data: {
          name: input.name ?? existing.name,
          runtimeMinutes: input.runtimeMinutes ?? existing.runtimeMinutes,
          traktId: input.traktId ?? existing.traktId,
          tmdbId: input.tmdbId ?? existing.tmdbId,
        },
      });
    }

    let season = await this.prisma.season.findUnique({
      where: {
        titleId_seasonNumber: {
          titleId: input.titleId,
          seasonNumber: input.seasonNumber,
        },
      },
    });
    if (!season) {
      season = await this.prisma.season.create({
        data: {
          titleId: input.titleId,
          seasonNumber: input.seasonNumber,
          name: `Season ${input.seasonNumber}`,
        },
      });
    }

    return this.prisma.episode.create({
      data: {
        titleId: input.titleId,
        seasonId: season.id,
        seasonNumber: input.seasonNumber,
        episodeNumber: input.episodeNumber,
        name: input.name ?? null,
        runtimeMinutes: input.runtimeMinutes ?? null,
        traktId: input.traktId ?? null,
        tmdbId: input.tmdbId ?? null,
      },
    });
  }

  async linkGenres(
    titleId: string,
    genres: string[],
    source = "tmdb",
  ) {
    for (const raw of genres) {
      const name = raw.trim();
      if (!name) continue;
      const slug = slugify(name);
      const genre = await this.prisma.genre.upsert({
        where: { slug },
        create: { name, slug },
        update: { name },
      });
      await this.prisma.titleGenre.upsert({
        where: {
          titleId_genreId_source: { titleId, genreId: genre.id, source },
        },
        create: { titleId, genreId: genre.id, source },
        update: {},
      });
    }
  }

  async recordWatch(input: RecordWatchInput) {
    const event = await this.prisma.watchEvent.upsert({
      where: {
        userId_dedupeKey: {
          userId: input.userId,
          dedupeKey: input.dedupeKey,
        },
      },
      create: {
        userId: input.userId,
        titleId: input.titleId,
        episodeId: input.episodeId ?? null,
        watchedAt: input.watchedAt,
        source: input.source,
        dedupeKey: input.dedupeKey,
        action: input.action ?? "watch",
        progress: input.progress ?? 100,
        rating: input.rating ?? null,
        runtimeMinutes: input.runtimeMinutes ?? null,
        precision: input.precision ?? "second",
        rawPayload: input.rawPayload ?? null,
      },
      update: {
        progress: input.progress ?? 100,
        rating: input.rating ?? undefined,
        runtimeMinutes: input.runtimeMinutes ?? undefined,
      },
    });

    const minutes =
      input.runtimeMinutes ??
      (await this.prisma.title.findUnique({ where: { id: input.titleId } }))
        ?.runtimeMinutes ??
      0;

    await this.bumpHourBucket(input.userId, input.watchedAt, minutes);
    return event;
  }

  async bumpHourBucket(userId: string, watchedAt: Date, minutes: number) {
    const hourStart = hourStartUtc(watchedAt);
    await this.prisma.watchHourBucket.upsert({
      where: { userId_hourStart: { userId, hourStart } },
      create: {
        userId,
        hourStart,
        watchCount: 1,
        minutesWatched: Math.max(0, minutes),
      },
      update: {
        watchCount: { increment: 1 },
        minutesWatched: { increment: Math.max(0, minutes) },
      },
    });
  }

  async upsertListState(input: {
    userId: string;
    titleId: string;
    listType: string;
    source: string;
    rating?: number | null;
    listedAt?: Date | null;
  }) {
    return this.prisma.titleListState.upsert({
      where: {
        userId_titleId_listType_source: {
          userId: input.userId,
          titleId: input.titleId,
          listType: input.listType,
          source: input.source,
        },
      },
      create: {
        userId: input.userId,
        titleId: input.titleId,
        listType: input.listType,
        source: input.source,
        rating: input.rating ?? null,
        listedAt: input.listedAt ?? null,
      },
      update: {
        rating: input.rating ?? undefined,
        listedAt: input.listedAt ?? undefined,
      },
    });
  }
}
