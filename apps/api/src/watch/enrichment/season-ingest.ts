import type { PrismaService } from "../../prisma/prisma.service";
import {
  TMDB_EPISODES_PER_SEASON_LIMIT,
  TMDB_REQUEST_PACE_MS,
  TMDB_SEASON_INGEST_LIMIT,
} from "../tmdb/tmdb.constants";
import type { TmdbMovie, TmdbService } from "../tmdb/tmdb.service";

function parseDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function showStatusFields(detail: TmdbMovie) {
  return {
    status: detail.status ?? null,
    lastAirDate: parseDate(detail.last_air_date),
    totalEpisodes:
      detail.number_of_episodes != null && detail.number_of_episodes > 0
        ? detail.number_of_episodes
        : null,
  };
}

export async function ingestTmdbSeasons(
  prisma: PrismaService,
  tmdb: TmdbService,
  titleId: string,
  detail: TmdbMovie,
  pauseMs = TMDB_REQUEST_PACE_MS,
) {
  const seasons = (detail.seasons ?? [])
    .filter((s) => Number.isInteger(s.season_number) && s.season_number >= 0)
    .slice(0, TMDB_SEASON_INGEST_LIMIT);
  let episodes = 0;
  for (const [index, summary] of seasons.entries()) {
    if (index > 0 && pauseMs > 0) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
    const seasonDetail = await tmdb.getTvSeason(detail.id, summary.season_number);
    const season = await prisma.season.upsert({
      where: {
        titleId_seasonNumber: {
          titleId,
          seasonNumber: summary.season_number,
        },
      },
      create: {
        titleId,
        seasonNumber: summary.season_number,
        name: summary.name ?? `Season ${summary.season_number}`,
        episodeCount: summary.episode_count ?? null,
        posterUrl: tmdb.posterUrl(summary.poster_path),
        tmdbId: summary.id ?? null,
      },
      update: {
        name: summary.name ?? undefined,
        episodeCount: summary.episode_count ?? undefined,
        tmdbId: summary.id ?? undefined,
      },
    });
    for (const ep of (seasonDetail?.episodes ?? []).slice(
      0,
      TMDB_EPISODES_PER_SEASON_LIMIT,
    )) {
      if (!Number.isInteger(ep.episode_number) || ep.episode_number < 0) continue;
      const data = {
        name: ep.name ?? null,
        overview: ep.overview || null,
        airDate: parseDate(ep.air_date),
        runtimeMinutes: ep.runtime != null && ep.runtime > 0 ? ep.runtime : null,
        stillUrl: tmdb.posterUrl(ep.still_path),
        tmdbId: ep.id ?? null,
      };
      await prisma.episode.upsert({
        where: {
          titleId_seasonNumber_episodeNumber: {
            titleId,
            seasonNumber: summary.season_number,
            episodeNumber: ep.episode_number,
          },
        },
        create: {
          titleId,
          seasonId: season.id,
          seasonNumber: summary.season_number,
          episodeNumber: ep.episode_number,
          ...data,
        },
        update: {
          seasonId: season.id,
          name: data.name ?? undefined,
          overview: data.overview ?? undefined,
          airDate: data.airDate ?? undefined,
          runtimeMinutes: data.runtimeMinutes ?? undefined,
          stillUrl: data.stillUrl ?? undefined,
          tmdbId: data.tmdbId ?? undefined,
        },
      });
      episodes += 1;
    }
  }
  return { seasons: seasons.length, episodes };
}
