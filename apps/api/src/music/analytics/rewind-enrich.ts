import type { RewindTopGenre, RewindTopItem } from "@questorylabs/shared";
import { zonedDayKey } from "../../lib/timezone";

const FEATURE_SPLIT = /\s+(?:feat\.?|ft\.?|featuring|with|x)\s+|\s*,\s*|\s+&\s+/i;

type GenreRow = { genre: { id: string; name: string; kind: string } };

export function aggregateMoodsFromListens(
  listenRows: Array<{ track: { genres: GenreRow[] } }>,
  limit?: number,
): RewindTopGenre[] {
  const moodCounts = new Map<string, RewindTopGenre>();
  for (const l of listenRows) {
    for (const tg of l.track.genres) {
      if (tg.genre.kind !== "mood") continue;
      const cur = moodCounts.get(tg.genre.id) || {
        id: tg.genre.id,
        name: tg.genre.name,
        count: 0,
      };
      cur.count += 1;
      moodCounts.set(tg.genre.id, cur);
    }
  }
  return [...moodCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit ?? undefined);
}

export function featuredArtists(
  listens: Array<{ trackId: string; artistName: string }>,
  credits: Map<string, string>,
  limit = 5,
): RewindTopItem[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const l of listens) {
    const credit = credits.get(l.trackId);
    if (!credit) continue;
    const primary = l.artistName.trim().toLowerCase();
    const names = credit
      .split(FEATURE_SPLIT)
      .map((n) => n.trim())
      .filter((n) => n && n.toLowerCase() !== primary);
    for (const name of new Set(names)) {
      const key = name.toLowerCase();
      const cur = counts.get(key) ?? { name, count: 0 };
      cur.count += 1;
      counts.set(key, cur);
    }
  }
  return [...counts.entries()]
    .map(([id, c]) => ({ id: `credit:${id}`, name: c.name, count: c.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function maxRepeatsInDay(
  listens: Array<{
    trackId: string;
    listenedAt: Date;
    title: string;
    artistName: string;
  }>,
  timeZone: string,
): { name: string; subtitle: string; count: number; date: string } | null {
  const counts = new Map<
    string,
    { name: string; subtitle: string; count: number; date: string }
  >();
  for (const l of listens) {
    const date = zonedDayKey(l.listenedAt, timeZone);
    const key = `${date}|${l.trackId}`;
    const cur = counts.get(key) ?? {
      name: l.title,
      subtitle: l.artistName,
      count: 0,
      date,
    };
    cur.count += 1;
    counts.set(key, cur);
  }
  let best: { name: string; subtitle: string; count: number; date: string } | null =
    null;
  for (const row of counts.values()) {
    if (!best || row.count > best.count) best = row;
  }
  return best && best.count >= 2 ? best : null;
}
