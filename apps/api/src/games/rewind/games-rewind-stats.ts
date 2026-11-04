import type {
  RewindBusiestDay,
  RewindMonthBucket,
  RewindPeakBucket,
  RewindTopGenre,
  RewindTopItem,
} from "@questorylabs/shared";
import { parseStringArray } from "../../lib/json-arrays";
import { longestGapDays, longestStreakDays } from "../../lib/rewind-stats";
import { zonedDayKey, zonedParts } from "../../lib/timezone";

export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 16 * 60;
export const NEW_GAME_LIFETIME_FACTOR = 1.25;
export const ABANDONED_MAX_MINUTES = 120;
const LATE_NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3]);
const SLICE_MINUTES = 15;
const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TOP_LIMIT = 5;

export type GamesSessionRow = {
  gameId: string | null;
  title: string;
  startedAt: Date;
  durationSecs: number;
  game: { name: string; headerImage: string | null; genres: string } | null;
};

export type SnapshotRow = {
  gameId: string;
  observedAt: Date;
  playtimeForever: number;
};

export type GameInfo = { name: string; headerImage: string | null; genres: string };

export type Session = {
  key: string;
  name: string;
  startedAt: Date;
  minutes: number;
};

export type MinuteEvent = { day: string; itemId: string; name: string; minutes: number };

export const sessionKey = (row: { gameId: string | null; title: string }): string =>
  row.gameId ?? `title:${row.title}`;

export function normalizeSessions(rows: GamesSessionRow[]): Session[] {
  const out: Session[] = [];
  for (const row of rows) {
    const minutes = Math.min(Math.round(row.durationSecs / 60), MAX_SESSION_MINUTES);
    if (minutes < MIN_SESSION_MINUTES) continue;
    out.push({
      key: sessionKey(row),
      name: row.game?.name ?? row.title,
      startedAt: row.startedAt,
      minutes,
    });
  }
  return out;
}

function hourLabel(hour: number): string {
  const h12 = hour % 12 || 12;
  return `${h12}${hour < 12 ? "am" : "pm"}`;
}

function argmax(values: number[]): number {
  let best = -1;
  let bestValue = 0;
  values.forEach((v, i) => {
    if (v > bestValue) {
      best = i;
      bestValue = v;
    }
  });
  return best;
}

export function sessionShape(sessions: Session[], timeZone: string) {
  const hours = new Array<number>(24).fill(0);
  const dows = new Array<number>(7).fill(0);
  let total = 0;
  for (const s of sessions) {
    let offset = 0;
    while (offset < s.minutes) {
      const slice = Math.min(SLICE_MINUTES, s.minutes - offset);
      const mid = new Date(s.startedAt.getTime() + (offset + slice / 2) * 60_000);
      const parts = zonedParts(mid, timeZone);
      hours[parts.hour]! += slice;
      dows[parts.weekday]! += slice;
      total += slice;
      offset += slice;
    }
  }
  const late = hours.reduce((sum, m, h) => (LATE_NIGHT_HOURS.has(h) ? sum + m : sum), 0);
  const peakH = argmax(hours);
  const peakD = argmax(dows);
  const peakHour: RewindPeakBucket | null =
    peakH >= 0 ? { index: peakH, label: hourLabel(peakH), count: hours[peakH]! } : null;
  const peakDow: RewindPeakBucket | null =
    peakD >= 0 ? { index: peakD, label: DOW_LABELS[peakD]!, count: dows[peakD]! } : null;
  return {
    lateNightShare: total > 0 ? Math.round((late / total) * 100) : null,
    peakHour,
    peakDow,
  };
}

export function longestSession(
  sessions: Session[],
  timeZone: string,
): { name: string; minutes: number; date: string } | null {
  let best: Session | null = null;
  for (const s of sessions) if (!best || s.minutes > best.minutes) best = s;
  return best
    ? { name: best.name, minutes: best.minutes, date: zonedDayKey(best.startedAt, timeZone) }
    : null;
}

export function sessionMinuteEvents(sessions: Session[], timeZone: string): MinuteEvent[] {
  return sessions.map((s) => ({
    day: zonedDayKey(s.startedAt, timeZone),
    itemId: s.key,
    name: s.name,
    minutes: s.minutes,
  }));
}

export function snapshotMinuteEvents(
  rows: SnapshotRow[],
  baseline: Map<string, number>,
  names: Map<string, string>,
  timeZone: string,
): MinuteEvent[] {
  const sorted = [...rows].sort((a, b) =>
    a.gameId === b.gameId
      ? a.observedAt.getTime() - b.observedAt.getTime()
      : a.gameId < b.gameId
        ? -1
        : 1,
  );
  const out: MinuteEvent[] = [];
  let prevGame: string | null = null;
  let prev = 0;
  for (const row of sorted) {
    if (row.gameId !== prevGame) {
      prevGame = row.gameId;
      prev = baseline.get(row.gameId) ?? row.playtimeForever;
    }
    const delta = row.playtimeForever - prev;
    prev = Math.max(prev, row.playtimeForever);
    if (delta <= 0) continue;
    out.push({
      day: zonedDayKey(row.observedAt, timeZone),
      itemId: row.gameId,
      name: names.get(row.gameId) ?? "",
      minutes: delta,
    });
  }
  return out;
}

export function minutesByItem(events: MinuteEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) out.set(e.itemId, (out.get(e.itemId) ?? 0) + e.minutes);
  return out;
}

export function mergeItemMinutes(
  sessions: Map<string, number>,
  snapshots: Map<string, number>,
): Map<string, number> {
  const out = new Map(sessions);
  for (const [id, minutes] of snapshots) {
    if (minutes > (out.get(id) ?? 0)) out.set(id, minutes);
  }
  return out;
}

export function minuteMonthly(period: string, events: MinuteEvent[]): RewindMonthBucket[] {
  const yearly = period.length === 4;
  const keys: string[] = [];
  if (yearly) {
    for (let m = 1; m <= 12; m++) keys.push(`${period}-${String(m).padStart(2, "0")}`);
  } else {
    const [y, m] = period.split("-").map(Number);
    const days = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
    for (let d = 1; d <= days; d++) keys.push(`${period}-${String(d).padStart(2, "0")}`);
  }
  const totals = new Map<string, number>();
  const byItem = new Map<string, Map<string, { name: string; minutes: number }>>();
  for (const e of events) {
    const key = yearly ? e.day.slice(0, 7) : e.day;
    totals.set(key, (totals.get(key) ?? 0) + e.minutes);
    let items = byItem.get(key);
    if (!items) byItem.set(key, (items = new Map()));
    const cur = items.get(e.itemId);
    if (cur) cur.minutes += e.minutes;
    else items.set(e.itemId, { name: e.name, minutes: e.minutes });
  }
  return keys.map((month) => {
    let top: { name: string; minutes: number } | null = null;
    for (const item of byItem.get(month)?.values() ?? []) {
      if (!top || item.minutes > top.minutes) top = item;
    }
    return { month, count: totals.get(month) ?? 0, topItem: top?.name || null };
  });
}

export function minuteBusiestDay(events: MinuteEvent[]): RewindBusiestDay | null {
  const byDay = new Map<string, number>();
  for (const e of events) byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.minutes);
  let best: RewindBusiestDay | null = null;
  for (const [date, count] of byDay) {
    if (!best || count > best.count || (count === best.count && date < best.date)) {
      best = { date, count };
    }
  }
  return best;
}

export function dayExtras(events: MinuteEvent[], period: string) {
  const days = events.filter((e) => e.minutes > 0).map((e) => e.day);
  return {
    activeDays: new Set(days).size,
    longestStreakDays: longestStreakDays(days),
    longestGapDays: longestGapDays(days),
    busiestDay: minuteBusiestDay(events),
    monthly: minuteMonthly(period, events),
  };
}

export function topGames(
  minutes: Map<string, number>,
  info: Map<string, GameInfo>,
  fallbackNames: Map<string, string>,
): RewindTopItem[] {
  return [...minutes.entries()]
    .filter(([, m]) => m > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LIMIT)
    .map(([id, count]) => ({
      id,
      name: info.get(id)?.name ?? fallbackNames.get(id) ?? id.replace(/^title:/, ""),
      count,
      imageUrl: info.get(id)?.headerImage ?? null,
    }));
}

export function topGenres(
  minutes: Map<string, number>,
  info: Map<string, GameInfo>,
): RewindTopGenre[] {
  const byGenre = new Map<string, number>();
  for (const [id, m] of minutes) {
    const g = info.get(id);
    if (!g) continue;
    for (const genre of parseStringArray(g.genres)) {
      byGenre.set(genre, (byGenre.get(genre) ?? 0) + m);
    }
  }
  return [...byGenre.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LIMIT)
    .map(([name, count]) => ({ id: name.toLowerCase(), name, count }));
}

export function countNewGames(input: {
  minutes: Map<string, number>;
  playedBefore: Set<string>;
  lifetime: Map<string, number>;
}): number {
  let n = 0;
  for (const [id, m] of input.minutes) {
    if (m <= 0 || input.playedBefore.has(id)) continue;
    const lifetime = input.lifetime.get(id);
    if (lifetime === undefined || lifetime <= m * NEW_GAME_LIFETIME_FACTOR) n += 1;
  }
  return n;
}

export function countUnlocksInPeriod(
  unlockTimes: number[],
  start: Date,
  end: Date,
): number {
  const s = start.getTime() / 1000;
  const e = end.getTime() / 1000;
  return unlockTimes.filter((t) => t >= s && t < e).length;
}
