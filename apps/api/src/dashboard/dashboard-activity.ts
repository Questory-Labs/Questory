import { zonedIsoWeekKey, zonedParts } from "../lib/timezone";
import {
  DASHBOARD_HOURS_PER_WEEK,
  DASHBOARD_SESSION_MAX_SECS,
} from "./dashboard.constants";

export type SessionSpan = { startedAt: Date; durationSecs: number };

export type DashboardTimePlayed = {
  todaySecs: number;
  weekSecs: number;
  monthSecs: number;
  priorWeekSecs: number;
  weekHourlySecs: number[];
};

const HOUR_MS = 60 * 60 * 1000;
const SLICE_MS = 15 * 60 * 1000;

function monthKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${p.month}`;
}

function dayKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function bucketTimePlayed(
  sessions: SessionSpan[],
  timeZone: string,
  now = new Date(),
): DashboardTimePlayed {
  const todayKey = dayKey(now, timeZone);
  const weekKey = zonedIsoWeekKey(now, timeZone);
  const priorWeekKey = zonedIsoWeekKey(
    new Date(now.getTime() - 7 * 24 * HOUR_MS),
    timeZone,
  );
  const thisMonth = monthKey(now, timeZone);
  const out: DashboardTimePlayed = {
    todaySecs: 0,
    weekSecs: 0,
    monthSecs: 0,
    priorWeekSecs: 0,
    weekHourlySecs: Array.from({ length: DASHBOARD_HOURS_PER_WEEK }, () => 0),
  };

  for (const s of sessions) {
    const total = Math.min(Math.max(0, s.durationSecs), DASHBOARD_SESSION_MAX_SECS);
    let cursor = s.startedAt.getTime();
    const end = cursor + total * 1000;
    while (cursor < end) {
      const nextHour = Math.min(end, (Math.floor(cursor / SLICE_MS) + 1) * SLICE_MS);
      const secs = (nextHour - cursor) / 1000;
      const at = new Date(cursor);
      const p = zonedParts(at, timeZone);
      const wk = zonedIsoWeekKey(at, timeZone);
      if (`${p.year}-${p.month}-${p.day}` === todayKey) out.todaySecs += secs;
      if (`${p.year}-${p.month}` === thisMonth) out.monthSecs += secs;
      if (wk === priorWeekKey) out.priorWeekSecs += secs;
      if (wk === weekKey) {
        out.weekSecs += secs;
        const idx = ((p.weekday + 6) % 7) * 24 + p.hour;
        out.weekHourlySecs[idx] = (out.weekHourlySecs[idx] ?? 0) + secs;
      }
      cursor = nextHour;
    }
  }

  return {
    todaySecs: Math.round(out.todaySecs),
    weekSecs: Math.round(out.weekSecs),
    monthSecs: Math.round(out.monthSecs),
    priorWeekSecs: Math.round(out.priorWeekSecs),
    weekHourlySecs: out.weekHourlySecs.map((v) => Math.round(v)),
  };
}

export function sumMonthSpend(
  purchases: { amount: number; currency: string; purchasedAt: Date }[],
  timeZone: string,
  now = new Date(),
): { amount: number; currency: string } | null {
  const thisMonth = monthKey(now, timeZone);
  const inMonth = purchases.filter(
    (p) => monthKey(p.purchasedAt, timeZone) === thisMonth,
  );
  if (!inMonth.length) return null;
  const byCurrency = new Map<string, number>();
  for (const p of inMonth) {
    byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + p.amount);
  }
  const [currency, amount] = [...byCurrency.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]!;
  return { amount: Math.round(amount * 100) / 100, currency };
}
