import { zonedDayKey } from "../../lib/timezone";

export type DayListen = {
  listenedAt: Date;
  track: { durationMs: number | null };
};

export function listenMinutes(listens: Array<{ track: { durationMs: number | null } }>) {
  let ms = 0;
  for (const l of listens) {
    if (l.track.durationMs != null && l.track.durationMs > 0) {
      ms += l.track.durationMs;
    }
  }
  return Math.round(ms / 60_000);
}

export function rollUpDays(listens: DayListen[], timeZone: string) {
  const rolled = new Map<string, { count: number; ms: number }>();
  for (const l of listens) {
    const key = zonedDayKey(l.listenedAt, timeZone);
    const cur = rolled.get(key) ?? { count: 0, ms: 0 };
    cur.count += 1;
    if (l.track.durationMs != null && l.track.durationMs > 0) {
      cur.ms += l.track.durationMs;
    }
    rolled.set(key, cur);
  }
  return [...rolled.entries()].map(([key, v]) => ({
    key,
    label: key,
    count: v.count,
    minutes: Math.round(v.ms / 60_000),
  }));
}

export function percentDelta(current: number, previous: number) {
  if (previous > 0) {
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }
  return current > 0 ? 100 : 0;
}
