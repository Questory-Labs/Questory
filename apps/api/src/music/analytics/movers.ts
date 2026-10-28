import type { MusicMover } from "@questorylabs/shared";

export type RankedItem = {
  id: string;
  name?: string;
  title?: string;
  artistName?: string;
  count: number;
};

export function concentrationShare(
  items: Array<{ count: number }>,
  total: number,
  topN: number,
): number {
  if (total <= 0) return 0;
  const sum = items.slice(0, topN).reduce((acc, item) => acc + item.count, 0);
  return Math.min(100, Math.round((sum / total) * 1000) / 10);
}

export function computeMovers(
  current: RankedItem[],
  previous: RankedItem[],
  window: number,
  limit: number,
): MusicMover[] {
  const previousRank = new Map<string, { rank: number; count: number }>();
  previous.forEach((item, i) => {
    previousRank.set(item.id, { rank: i + 1, count: item.count });
  });

  return current
    .slice(0, window)
    .map((item, i) => {
      const rank = i + 1;
      const prior = previousRank.get(item.id) ?? null;
      const delta = prior ? prior.rank - rank : null;
      return {
        mover: {
          id: item.id,
          name: item.name ?? item.title ?? "",
          ...(item.artistName ? { artistName: item.artistName } : {}),
          count: item.count,
          previousCount: prior?.count ?? 0,
          rank,
          previousRank: prior?.rank ?? null,
          delta,
          isNew: prior == null,
        },
        score: prior == null ? window - rank + 1 : Math.abs(delta ?? 0),
      };
    })
    .filter((entry) => entry.mover.isNew || entry.mover.delta !== 0)
    .sort((a, b) => b.score - a.score || a.mover.rank - b.mover.rank)
    .slice(0, limit)
    .map((entry) => entry.mover);
}
