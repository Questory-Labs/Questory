import {
  isValidTimeZone,
  zonedDayKey,
  zonedHour,
  zonedIsoWeekKey,
  zonedWeekday,
} from "../../lib/timezone";
import { daysAgo } from "./helpers";

export const DAY_MS = 24 * 60 * 60 * 1000;

export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type RangeKey = "day" | "week" | "month" | "year" | "all";

export type Granularity = "hourOfDay" | "dayOfWeek" | "day" | "week";

const RANGE_DAYS: Record<Exclude<RangeKey, "all">, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseRange(value: unknown, fallback: RangeKey): RangeKey {
  const raw = str(value);
  return raw === "all" || (raw != null && Object.hasOwn(RANGE_DAYS, raw))
    ? (raw as RangeKey)
    : fallback;
}

export function rangeBounds(
  range: RangeKey,
  now = Date.now(),
): { start: number | null; previousStart: number | null } {
  if (range === "all") return { start: null, previousStart: null };
  const span = RANGE_DAYS[range] * DAY_MS;
  return { start: now - span, previousStart: now - 2 * span };
}

export function inRange(at: Date, start: number | null): boolean {
  return start == null || at.getTime() >= start;
}

export function intParam(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = str(value);
  if (raw == null || !/^\d{1,6}$/.test(raw)) return fallback;
  return Math.min(max, Math.max(min, Number.parseInt(raw, 10)));
}

export function pageParams(query: Record<string, unknown>) {
  return {
    page: intParam(query.page, 1, 1, 100_000),
    pageSize: intParam(query.pageSize ?? query.limit, 40, 1, 100),
  };
}

export function tzParam(query: Record<string, unknown>): string {
  const raw = str(query.tz)?.trim();
  return raw && isValidTimeZone(raw) ? raw : "UTC";
}

export function periodParam(value: unknown, now = new Date()): string {
  const raw = str(value);
  const match = raw == null ? null : /^(\d{4})(?:-(\d{2}))?$/.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = match[2] == null ? 1 : Number(match[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
      return raw as string;
    }
  }
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function atDaysAgo(days: number, hour: number, minute: number): Date {
  const now = Date.now();
  const midnight = new Date(daysAgo(days));
  midnight.setUTCHours(hour, minute, 0, 0);
  return days <= 0 || midnight.getTime() > now
    ? new Date(now - 2 * 60 * 1000)
    : midnight;
}

export function hourLabel(hour: number): string {
  return `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
}

export function seeded(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2147483647 | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

export function eveningTime(next: () => number, daysBack: number): Date {
  const afternoon = next() < 0.2;
  const hour = afternoon
    ? 14 + Math.floor(next() * 4)
    : 19 + Math.floor(next() * 4);
  return atDaysAgo(daysBack, hour, Math.floor(next() * 60));
}

function peakIndex(buckets: number[]): number {
  return buckets.indexOf(Math.max(...buckets, 0));
}

export function hourAndDowBuckets(dates: Date[], timeZone: string) {
  const hours = Array.from({ length: 24 }, () => 0);
  const dows = Array.from({ length: 7 }, () => 0);
  for (const at of dates) {
    hours[zonedHour(at, timeZone)] += 1;
    dows[zonedWeekday(at, timeZone)] += 1;
  }
  return { hours, dows };
}

export function insightPeaks(dates: Date[], timeZone: string) {
  const { hours, dows } = hourAndDowBuckets(dates, timeZone);
  const hour = peakIndex(hours);
  const day = peakIndex(dows);
  return {
    peakHour:
      dates.length > 0
        ? { hour, label: hourLabel(hour), count: hours[hour]! }
        : null,
    peakDow:
      dates.length > 0
        ? { day, label: DOW_LABELS[day]!, count: dows[day]! }
        : null,
  };
}

export function rewindPeaks(dates: Date[], timeZone: string) {
  const { hours, dows } = hourAndDowBuckets(dates, timeZone);
  const hour = peakIndex(hours);
  const day = peakIndex(dows);
  return {
    peakHour:
      dates.length > 0
        ? { index: hour, label: hourLabel(hour), count: hours[hour]! }
        : null,
    peakDow:
      dates.length > 0
        ? { index: day, label: DOW_LABELS[day]!, count: dows[day]! }
        : null,
  };
}

export function parseGranularity(value: unknown): Granularity {
  const raw = str(value);
  return raw === "hourOfDay" || raw === "dayOfWeek" || raw === "week"
    ? raw
    : "day";
}

export function timeBuckets(
  dates: Date[],
  granularity: Granularity,
  timeZone: string,
) {
  const { hours, dows } = hourAndDowBuckets(dates, timeZone);
  if (granularity === "hourOfDay") {
    return hours.map((count, hour) => ({
      key: String(hour),
      label: `${String(hour).padStart(2, "0")}:00`,
      count,
    }));
  }
  if (granularity === "dayOfWeek") {
    return dows.map((count, day) => ({
      key: String(day),
      label: DOW_LABELS[day]!,
      count,
    }));
  }
  const counts = new Map<string, number>();
  for (const at of dates) {
    const key =
      granularity === "week"
        ? zonedIsoWeekKey(at, timeZone)
        : zonedDayKey(at, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ key, label: key, count }));
}

export function tally<T>(
  items: T[],
  keys: (item: T) => string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const key of keys(item)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function sortedCounts(counts: Map<string, number>) {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function genreId(name: string): string {
  return `genre-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function genreCounts<T>(items: T[], genresOf: (item: T) => string[]) {
  return sortedCounts(tally(items, genresOf)).map(({ name, count }) => ({
    id: genreId(name),
    name,
    count,
  }));
}

export function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}
