import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { hourStartUtc, normalizeName, slugify } from "../lib/normalize";
import { findTitleByName } from "./title-match";
import { claimTmdbId } from "./title-merge";

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
  kitsuId?: number | null;
  bangumiId?: number | null;
  shikimoriId?: number | null;
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

  private posterForUpdate(
    existing: { posterUrl: string | null; imageManual: boolean },
    incoming?: string | null,
  ) {
    if (existing.imageManual) return existing.posterUrl;
    return incoming ?? existing.posterUrl;
  }

  private normalizeOptionalText(value: string | null | undefined) {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async updateTitle(
    id: string,
    input: { displayName?: string | null; posterUrl?: string | null },
  ) {
    const title = await this.prisma.title.findUnique({ where: { id } });
    if (!title) throw new NotFoundException("Title not found");

    const data: {
      displayName?: string | null;
      posterUrl?: string | null;
      imageManual?: boolean;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = this.normalizeOptionalText(input.displayName);
    }
    if (input.posterUrl !== undefined) {
      const url = this.normalizeOptionalText(input.posterUrl);
      data.posterUrl = url;
      data.imageManual = url != null;
    }

    return this.prisma.title.update({ where: { id }, data });
  }

  async upsertTitle(input: UpsertTitleInput) {
    const nameNormalized = normalizeName(input.name);
    const idMerge = {
      traktId: input.traktId ?? null,
      tmdbId: input.tmdbId ?? null,
      imdbId: input.imdbId ?? null,
      anilistId: input.anilistId ?? null,
      malId: input.malId ?? null,
      kitsuId: input.kitsuId ?? null,
      bangumiId: input.bangumiId ?? null,
      shikimoriId: input.shikimoriId ?? null,
    };

    const mergeUpdate = (
      existing: {
        name: string;
        nameNormalized: string;
        traktId: number | null;
        tmdbId: number | null;
        imdbId: string | null;
        anilistId: number | null;
        malId: number | null;
        kitsuId: number | null;
        bangumiId: number | null;
        shikimoriId: number | null;
        year: number | null;
        overview: string | null;
        runtimeMinutes: number | null;
        posterUrl: string | null;
        imageManual: boolean;
      },
    ) => ({
      name:
        existing.tmdbId != null && input.tmdbId == null
          ? existing.name
          : input.name,
      nameNormalized:
        existing.tmdbId != null && input.tmdbId == null
          ? existing.nameNormalized
          : nameNormalized,
      year: input.year ?? existing.year,
      overview: input.overview ?? existing.overview,
      runtimeMinutes: input.runtimeMinutes ?? existing.runtimeMinutes,
      posterUrl: this.posterForUpdate(existing, input.posterUrl),
      traktId: idMerge.traktId ?? existing.traktId,
      tmdbId: idMerge.tmdbId ?? existing.tmdbId,
      imdbId: idMerge.imdbId ?? existing.imdbId,
      anilistId: idMerge.anilistId ?? existing.anilistId,
      malId: idMerge.malId ?? existing.malId,
      kitsuId: idMerge.kitsuId ?? existing.kitsuId,
      bangumiId: idMerge.bangumiId ?? existing.bangumiId,
      shikimoriId: idMerge.shikimoriId ?? existing.shikimoriId,
    });

    if (input.tmdbId != null) {
      const byTmdb = await this.prisma.title.findUnique({
        where: { type_tmdbId: { type: input.type, tmdbId: input.tmdbId } },
      });
      if (byTmdb) {
        return this.prisma.title.update({
          where: { id: byTmdb.id },
          data: mergeUpdate(byTmdb),
        });
      }
    }

    const idLookups: Array<{
      field: keyof Pick<
        UpsertTitleInput,
        | "traktId"
        | "anilistId"
        | "malId"
        | "kitsuId"
        | "bangumiId"
        | "shikimoriId"
      >;
      where: Record<string, unknown>;
    }> = [
      {
        field: "traktId",
        where: { type: input.type, traktId: input.traktId ?? undefined },
      },
      { field: "anilistId", where: { anilistId: input.anilistId ?? undefined } },
      { field: "malId", where: { malId: input.malId ?? undefined } },
      { field: "kitsuId", where: { kitsuId: input.kitsuId ?? undefined } },
      { field: "bangumiId", where: { bangumiId: input.bangumiId ?? undefined } },
      {
        field: "shikimoriId",
        where: { shikimoriId: input.shikimoriId ?? undefined },
      },
    ];

    for (const lookup of idLookups) {
      if (input[lookup.field] == null) continue;
      const found = await this.prisma.title.findFirst({ where: lookup.where });
      if (found) {
        const keep = await this.keepForUpsert(found, input);
        return this.prisma.title.update({
          where: { id: keep.id },
          data: mergeUpdate(keep),
        });
      }
    }

    if (input.imdbId) {
      const byImdb = await this.prisma.title.findFirst({
        where: { type: input.type, imdbId: input.imdbId },
      });
      if (byImdb) {
        const keep = await this.keepForUpsert(byImdb, input);
        return this.prisma.title.update({
          where: { id: keep.id },
          data: mergeUpdate(keep),
        });
      }
    }

    const existing = await findTitleByName(this.prisma, input);
    if (existing) {
      const keep = await this.keepForUpsert(existing, input);
      return this.prisma.title.update({
        where: { id: keep.id },
        data: mergeUpdate(keep),
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
        traktId: idMerge.traktId,
        tmdbId: idMerge.tmdbId,
        imdbId: idMerge.imdbId,
        anilistId: idMerge.anilistId,
        malId: idMerge.malId,
        kitsuId: idMerge.kitsuId,
        bangumiId: idMerge.bangumiId,
        shikimoriId: idMerge.shikimoriId,
      },
    });
  }

  /** Prefer the title that already owns `tmdbId` so unique(type, tmdbId) cannot collide. */
  private async keepForUpsert(
    found: NonNullable<Awaited<ReturnType<PrismaService["title"]["findFirst"]>>>,
    input: UpsertTitleInput,
  ) {
    if (input.tmdbId == null) return found;
    const id = await claimTmdbId(this.prisma, found.id, input.type, input.tmdbId);
    if (id === found.id) return found;
    return this.prisma.title.findUniqueOrThrow({ where: { id } });
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
        ...(input.rating != null ? { rating: input.rating } : {}),
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

  async rebuildWatchHourBuckets(userId: string) {
    await this.prisma.watchHourBucket.deleteMany({ where: { userId } });
    const events = await this.prisma.watchEvent.findMany({
      where: { userId },
      include: { title: { select: { runtimeMinutes: true } } },
      orderBy: { watchedAt: "asc" },
    });
    for (const event of events) {
      const minutes =
        event.runtimeMinutes ?? event.title.runtimeMinutes ?? 0;
      await this.bumpHourBucket(userId, event.watchedAt, minutes);
    }
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
