import type { WatchRecentEvent } from "@questorylabs/shared";
import { formatDateTime, formatDate } from "@/lib/dates";
import { precisionLabel, sourceLabel } from "@/modules/media/shelf/shelf.utils";
import type { WatchMediaFilter } from "../home/watch.home.types";
import { episodeCode } from "../home/watch.home.utils";

export const watchHistoryQuery = (
  page: number,
  pageSize: number,
  type: WatchMediaFilter,
  q: string,
): string => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (type !== "all") params.set("type", type);
  if (q) params.set("q", q);
  return params.toString();
};

export const watchEventTitle = (e: WatchRecentEvent): string =>
  e.episode
    ? `${e.title.name} · ${episodeCode(e.episode.seasonNumber, e.episode.episodeNumber)}`
    : e.title.name;

export const watchEventKind = (e: WatchRecentEvent): string =>
  e.title.type === "movie" ? "Movie" : "TV";

export const watchEventMeta = (e: WatchRecentEvent): string =>
  `${sourceLabel(e.source)} · ${precisionLabel(e.precision)}`;

export const watchEventDate = (e: WatchRecentEvent): string =>
  e.precision === "exact" || e.precision === "second" ? formatDateTime(e.watchedAt) : formatDate(e.watchedAt);
