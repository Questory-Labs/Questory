import type { RewindTopItem } from "@questorylabs/shared";
import { zonedDayKey } from "../../lib/timezone";

const BINGE_MIN_EPISODES = 3;
const LIST_LIMIT = 5;

export type WatchEnrichEvent = {
  titleId: string;
  name: string;
  type: string;
  imageUrl: string | null;
  watchedAt: Date;
  episodeId: string | null;
  progress: number;
  rating: number | null;
};

export function enrichWatchRewind(events: WatchEnrichEvent[], timeZone: string) {
  const ratings = new Map<string, { item: RewindTopItem; rating: number }>();
  const progress = new Map<string, { item: RewindTopItem; max: number }>();
  const dailyEpisodes = new Map<string, { item: RewindTopItem; episodes: Set<string> }>();
  let ratingSum = 0;
  let ratedCount = 0;

  for (const e of events) {
    const item = (): RewindTopItem => ({
      id: e.titleId,
      name: e.name,
      subtitle: e.type,
      imageUrl: e.imageUrl,
      count: 0,
    });
    if (e.rating != null && Number.isFinite(e.rating)) {
      ratingSum += e.rating;
      ratedCount += 1;
      const cur = ratings.get(e.titleId);
      if (!cur || e.rating > cur.rating) {
        ratings.set(e.titleId, { item: item(), rating: e.rating });
      }
    }
    const p = progress.get(e.titleId) ?? { item: item(), max: 0 };
    p.max = Math.max(p.max, e.progress);
    p.item.count += 1;
    progress.set(e.titleId, p);

    if (e.type === "show" && e.episodeId) {
      const key = `${zonedDayKey(e.watchedAt, timeZone)}|${e.titleId}`;
      const day = dailyEpisodes.get(key) ?? { item: item(), episodes: new Set() };
      day.episodes.add(e.episodeId);
      dailyEpisodes.set(key, day);
    }
  }

  const bestBinge = new Map<string, RewindTopItem>();
  for (const day of dailyEpisodes.values()) {
    const n = day.episodes.size;
    if (n < BINGE_MIN_EPISODES) continue;
    const cur = bestBinge.get(day.item.id);
    if (!cur || n > cur.count) bestBinge.set(day.item.id, { ...day.item, count: n });
  }

  return {
    avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    ratedCount,
    topRated: [...ratings.values()]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, LIST_LIMIT)
      .map(({ item, rating }) => ({ ...item, count: rating })),
    unfinished: [...progress.values()]
      .filter((p) => p.max < 100)
      .sort((a, b) => b.item.count - a.item.count)
      .slice(0, LIST_LIMIT)
      .map((p) => ({ ...p.item, count: p.max })),
    bingeRuns: [...bestBinge.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, LIST_LIMIT),
  };
}
