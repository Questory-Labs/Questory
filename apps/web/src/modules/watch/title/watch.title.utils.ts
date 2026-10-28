import type { WatchCatalogLog, WatchTitleDetail, WatchTitleSeason } from "@questorylabs/shared";
import { localDayKey } from "@/lib/dates";

export const WATCH_TITLE_TOUCHES = [
  ["watch-insights"],
  ["watch-recent"],
  ["watch-ts-hour"],
  ["watch-ts-dow"],
  ["watch-years"],
  ["watch-sources"],
  ["watch-tops"],
  ["watch-continue"],
];

export const nextUnwatched = (
  seasons: WatchTitleSeason[] | undefined,
): { seasonNumber: number; episodeNumber: number } | null => {
  const ordered = [...(seasons ?? [])]
    .filter((s) => s.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  let lastWatched: { season: number; episode: number } | null = null;
  for (const s of ordered) {
    for (const e of s.episodes) {
      if (e.watchCount > 0) lastWatched = { season: s.seasonNumber, episode: e.episodeNumber };
    }
  }
  for (const s of ordered) {
    const eps = [...s.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
    for (const e of eps) {
      if (e.watchCount > 0) continue;
      if (
        lastWatched &&
        (s.seasonNumber < lastWatched.season ||
          (s.seasonNumber === lastWatched.season && e.episodeNumber < lastWatched.episode))
      ) {
        continue;
      }
      return { seasonNumber: s.seasonNumber, episodeNumber: e.episodeNumber };
    }
  }
  return null;
};

export const defaultSeason = (seasons: WatchTitleSeason[] | undefined): number | null => {
  const next = nextUnwatched(seasons);
  if (next) return next.seasonNumber;
  const list = (seasons ?? []).filter((s) => s.seasonNumber > 0);
  return list.length ? list[list.length - 1].seasonNumber : seasons?.[0]?.seasonNumber ?? null;
};

export const markWatchedBody = (
  d: WatchTitleDetail,
  now = new Date(),
): WatchCatalogLog | null => {
  const watchedAt = localDayKey(now.toISOString());
  if (d.title.type === "movie") return { titleId: d.title.id, type: "movie", watchedAt };
  const next = nextUnwatched(d.seasons);
  if (!next) return null;
  return { titleId: d.title.id, type: "show", watchedAt, ...next };
};

export const tmdbUrl = (d: WatchTitleDetail): string | null =>
  d.title.tmdbId
    ? `https://www.themoviedb.org/${d.title.type === "movie" ? "movie" : "tv"}/${d.title.tmdbId}`
    : null;

export const formatHoursMinutes = (minutes: number): { h: number; m: number } => ({
  h: Math.floor(minutes / 60),
  m: Math.round(minutes % 60),
});
