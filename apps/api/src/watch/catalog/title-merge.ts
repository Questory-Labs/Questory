import { Prisma } from "../../generated/prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";

/** Interactive transactions default to 5s; episode-heavy merges can exceed that. */
const ABSORB_TITLE_TIMEOUT_MS = 60_000;

type TitleRow = {
  id: string;
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
};

/**
 * Move all catalog rows from `dropId` onto `keepId`, then delete the duplicate.
 * Used when a later AniList/Letterboxd/TMDB enrich would collide on tmdbId.
 */
export async function absorbTitle(
  prisma: PrismaService,
  keepId: string,
  dropId: string,
): Promise<TitleRow> {
  if (keepId === dropId) {
    return prisma.title.findUniqueOrThrow({ where: { id: keepId } });
  }

  return prisma.$transaction(
    (tx) => mergeTitleRows(tx, keepId, dropId),
    { timeout: ABSORB_TITLE_TIMEOUT_MS },
  );
}

async function mergeTitleRows(
  prisma: Prisma.TransactionClient,
  keepId: string,
  dropId: string,
): Promise<TitleRow> {
  const [keep, drop] = await Promise.all([
    prisma.title.findUnique({ where: { id: keepId } }),
    prisma.title.findUnique({ where: { id: dropId } }),
  ]);
  if (!keep) {
    return prisma.title.findUniqueOrThrow({ where: { id: dropId } });
  }
  if (!drop) return keep;

  await prisma.title.update({
    where: { id: dropId },
    data: { tmdbId: null },
  });

  const [keepEpisodes, dropEpisodes] = await Promise.all([
    prisma.episode.findMany({ where: { titleId: keepId } }),
    prisma.episode.findMany({ where: { titleId: dropId } }),
  ]);
  const keepBySe = new Map(
    keepEpisodes.map((ep) => [`${ep.seasonNumber}:${ep.episodeNumber}`, ep]),
  );

  for (const ep of dropEpisodes) {
    const existing = keepBySe.get(`${ep.seasonNumber}:${ep.episodeNumber}`);
    if (existing) {
      await prisma.watchEvent.updateMany({
        where: { episodeId: ep.id },
        data: { episodeId: existing.id },
      });
      await prisma.episode.delete({ where: { id: ep.id } });
      continue;
    }

    let season = await prisma.season.findUnique({
      where: {
        titleId_seasonNumber: {
          titleId: keepId,
          seasonNumber: ep.seasonNumber,
        },
      },
    });
    if (!season) {
      season = await prisma.season.create({
        data: {
          titleId: keepId,
          seasonNumber: ep.seasonNumber,
          name: `Season ${ep.seasonNumber}`,
        },
      });
    }
    await prisma.episode.update({
      where: { id: ep.id },
      data: { titleId: keepId, seasonId: season.id },
    });
  }

  await prisma.season.deleteMany({ where: { titleId: dropId } });

  await prisma.watchEvent.updateMany({
    where: { titleId: dropId },
    data: { titleId: keepId },
  });

  const dropStates = await prisma.titleListState.findMany({
    where: { titleId: dropId },
  });
  for (const state of dropStates) {
    const conflict = await prisma.titleListState.findUnique({
      where: {
        userId_titleId_listType_source: {
          userId: state.userId,
          titleId: keepId,
          listType: state.listType,
          source: state.source,
        },
      },
    });
    if (conflict) {
      await prisma.titleListState.delete({ where: { id: state.id } });
    } else {
      await prisma.titleListState.update({
        where: { id: state.id },
        data: { titleId: keepId },
      });
    }
  }

  const dropGenres = await prisma.titleGenre.findMany({
    where: { titleId: dropId },
  });
  for (const row of dropGenres) {
    const conflict = await prisma.titleGenre.findUnique({
      where: {
        titleId_genreId_source: {
          titleId: keepId,
          genreId: row.genreId,
          source: row.source,
        },
      },
    });
    if (conflict) {
      await prisma.titleGenre.delete({
        where: {
          titleId_genreId_source: {
            titleId: dropId,
            genreId: row.genreId,
            source: row.source,
          },
        },
      });
    } else {
      await prisma.titleGenre.update({
        where: {
          titleId_genreId_source: {
            titleId: dropId,
            genreId: row.genreId,
            source: row.source,
          },
        },
        data: { titleId: keepId },
      });
    }
  }

  await prisma.titleEnrichmentJob.updateMany({
    where: { titleId: dropId },
    data: { titleId: keepId },
  });

  await prisma.title.update({
    where: { id: keepId },
    data: {
      traktId: keep.traktId ?? drop.traktId,
      tmdbId: keep.tmdbId ?? drop.tmdbId,
      imdbId: keep.imdbId ?? drop.imdbId,
      anilistId: keep.anilistId ?? drop.anilistId,
      malId: keep.malId ?? drop.malId,
      kitsuId: keep.kitsuId ?? drop.kitsuId,
      bangumiId: keep.bangumiId ?? drop.bangumiId,
      shikimoriId: keep.shikimoriId ?? drop.shikimoriId,
      year: keep.year ?? drop.year,
      overview: keep.overview ?? drop.overview,
      runtimeMinutes: keep.runtimeMinutes ?? drop.runtimeMinutes,
      posterUrl: keep.imageManual
        ? keep.posterUrl
        : (keep.posterUrl ?? drop.posterUrl),
    },
  });

  await prisma.title.delete({ where: { id: dropId } });
  return prisma.title.findUniqueOrThrow({ where: { id: keepId } });
}

/** If another title already owns this TMDB id, absorb `titleId` into that row. */
export async function claimTmdbId(
  prisma: PrismaService,
  titleId: string,
  type: string,
  tmdbId: number,
): Promise<string> {
  const owner = await prisma.title.findUnique({
    where: { type_tmdbId: { type, tmdbId } },
  });
  if (!owner || owner.id === titleId) return titleId;
  const merged = await absorbTitle(prisma, owner.id, titleId);
  return merged.id;
}
