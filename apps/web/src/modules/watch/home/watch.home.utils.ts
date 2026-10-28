import type { WatchContinueItem } from "@questorylabs/shared";
import type { WatchMediaFilter } from "./watch.home.types";

export const WATCH_HOME_RANGE = "month";
export const WATCH_HOME_TOPS_LIMIT = 5;
export const WATCH_HOME_CONTINUE_LIMIT = 6;

export const typeQuery = (type: WatchMediaFilter): string =>
  type === "all" ? "" : `&type=${type}`;

export const DOW_FULL: Record<string, string> = {
  Sun: "Sundays",
  Mon: "Mondays",
  Tue: "Tuesdays",
  Wed: "Wednesdays",
  Thu: "Thursdays",
  Fri: "Fridays",
  Sat: "Saturdays",
};

export const episodeCode = (season: number, episode: number): string =>
  season > 0 ? `S${season} E${episode}` : `E${episode}`;

export const continueNextLabel = (item: WatchContinueItem): string => {
  if (!item.next) return "Up to date";
  const code = item.anime
    ? `E${item.next.episodeNumber}`
    : episodeCode(item.next.seasonNumber, item.next.episodeNumber);
  const total = item.title.totalEpisodes;
  const left = total != null ? Math.max(0, total - item.watchedEpisodes) : null;
  return left != null && left > 0 ? `${code} next · ${left} left` : `${code} next`;
};
