/** IANA timezone helpers for calendar bucketing (peak hour, streaks, day series). */

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  /** 0 = Sunday … 6 = Saturday (matches `Date#getUTCDay`). */
  weekday: number;
};

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = partsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    partsCache.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validate IANA zone; default `UTC` when missing or invalid. */
export function parseTimeZone(tz?: string | null): string {
  if (tz == null || tz.trim() === "") return "UTC";
  const trimmed = tz.trim();
  return isValidTimeZone(trimmed) ? trimmed : "UTC";
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayRaw = get("weekday");
  const weekday = WEEKDAY_TO_INDEX[weekdayRaw];
  if (weekday == null) {
    throw new Error(`Unexpected weekday part: ${weekdayRaw}`);
  }

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    weekday,
  };
}

export function zonedDayKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function zonedHour(date: Date, timeZone: string): number {
  return zonedParts(date, timeZone).hour;
}

export function zonedWeekday(date: Date, timeZone: string): number {
  return zonedParts(date, timeZone).weekday;
}

/**
 * ISO week key in the given zone (`YYYY-Www`), using the local calendar date
 * of `date` then the same Thu-based ISO week algorithm as UTC rollups.
 */
export function zonedIsoWeekKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  const tmp = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Count consecutive local calendar days (ending today in `timeZone`) that
 * appear in `dates`. Walks backward one Gregorian calendar day at a time
 * using the zone’s Y-M-D components (not UTC midnight).
 */
export function computeStreakDays(
  dates: Date[],
  timeZone: string,
  now = new Date(),
): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => zonedDayKey(d, timeZone)));
  let streak = 0;
  let { year, month, day } = zonedParts(now, timeZone);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!days.has(key)) break;
    streak += 1;
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    year = prev.getUTCFullYear();
    month = prev.getUTCMonth() + 1;
    day = prev.getUTCDate();
  }
  return streak;
}
