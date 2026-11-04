import { BadRequestException } from "@nestjs/common";
import {
  previousRewindPeriod,
  type RewindBusiestDay,
  type RewindCommonExtras,
  type RewindMonthBucket,
  type RewindPriorComparison,
  type RewindTopItem,
} from "@questorylabs/shared";
import { isValidTimeZone, zonedDayKey } from "./timezone";

export type PeriodBounds = { start: Date; end: Date };

export type RewindEvent = { at: Date; itemId: string; name: string };

export type PriorItemCount = { id: string; name: string; count: number };

const PERIOD_RE = /^(\d{4})(?:-(\d{2}))?$/;
const DAY_MS = 86_400_000;
const DROPPED_OFF_LIMIT = 5;

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = offsetFormatters.get(timeZone);
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
    });
    offsetFormatters.set(timeZone, fmt);
  }
  return fmt;
}

function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = offsetFormatter(timeZone).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wall - Math.floor(instant / 1000) * 1000;
}

export function zonedMidnight(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const wall = Date.UTC(year, month - 1, day);
  let guess = wall - zoneOffsetMs(wall, timeZone);
  guess = wall - zoneOffsetMs(guess, timeZone);
  return new Date(guess);
}

export function parseRewindTimeZone(tz?: string | null): string {
  if (tz == null || tz.trim() === "") return "UTC";
  const trimmed = tz.trim();
  if (!isValidTimeZone(trimmed)) {
    throw new BadRequestException("tz must be a valid IANA time zone");
  }
  return trimmed;
}

export function zonedPeriodBounds(period: string, timeZone: string): PeriodBounds {
  const match = PERIOD_RE.exec(period);
  if (!match) throw new BadRequestException("period must be YYYY or YYYY-MM");
  const year = Number.parseInt(match[1]!, 10);
  if (match[2] == null) {
    return {
      start: zonedMidnight(year, 1, 1, timeZone),
      end: zonedMidnight(year + 1, 1, 1, timeZone),
    };
  }
  const month = Number.parseInt(match[2], 10);
  if (month < 1 || month > 12) {
    throw new BadRequestException("period month must be 01-12");
  }
  return {
    start: zonedMidnight(year, month, 1, timeZone),
    end:
      month === 12
        ? zonedMidnight(year + 1, 1, 1, timeZone)
        : zonedMidnight(year, month + 1, 1, timeZone),
  };
}

export function priorPeriodBounds(period: string, timeZone: string): PeriodBounds {
  return zonedPeriodBounds(previousRewindPeriod(period), timeZone);
}

function dayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / DAY_MS);
}

function sortedDayIndexes(dayKeys: Iterable<string>): number[] {
  return [...new Set(dayKeys)].map(dayIndex).sort((a, b) => a - b);
}

export function longestStreakDays(dayKeys: Iterable<string>): number {
  const days = sortedDayIndexes(dayKeys);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of days) {
    run = prev != null && day === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function longestGapDays(dayKeys: Iterable<string>): number {
  const days = sortedDayIndexes(dayKeys);
  let best = 0;
  for (let i = 1; i < days.length; i += 1) {
    best = Math.max(best, days[i]! - days[i - 1]! - 1);
  }
  return best;
}

export function busiestDay(
  dates: Date[],
  timeZone: string,
): RewindBusiestDay | null {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = zonedDayKey(date, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: RewindBusiestDay | null = null;
  for (const [date, count] of counts) {
    if (!best || count > best.count || (count === best.count && date < best.date)) {
      best = { date, count };
    }
  }
  return best;
}

function bucketKeys(period: string): string[] {
  const match = PERIOD_RE.exec(period);
  if (!match) return [];
  const year = match[1]!;
  if (match[2] == null) {
    return Array.from(
      { length: 12 },
      (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
    );
  }
  const month = Number.parseInt(match[2], 10);
  const days = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
  return Array.from(
    { length: days },
    (_, i) => `${year}-${match[2]}-${String(i + 1).padStart(2, "0")}`,
  );
}

export function monthlySeries(
  period: string,
  events: RewindEvent[],
  timeZone: string,
): RewindMonthBucket[] {
  const yearly = period.length === 4;
  const buckets = new Map(
    bucketKeys(period).map((key) => [
      key,
      { count: 0, items: new Map<string, { name: string; count: number }>() },
    ]),
  );
  for (const event of events) {
    const day = zonedDayKey(event.at, timeZone);
    const bucket = buckets.get(yearly ? day.slice(0, 7) : day);
    if (!bucket) continue;
    bucket.count += 1;
    const item = bucket.items.get(event.itemId) ?? { name: event.name, count: 0 };
    item.count += 1;
    bucket.items.set(event.itemId, item);
  }
  return [...buckets.entries()].map(([month, bucket]) => {
    let top: { name: string; count: number } | null = null;
    for (const item of bucket.items.values()) {
      if (!top || item.count > top.count) top = item;
    }
    return { month, count: bucket.count, topItem: top?.name ?? null };
  });
}

export function compareToPrior(input: {
  total: number;
  priorTotal: number;
  currentItemIds: Set<string>;
  priorItemIds: Set<string>;
  coverage: boolean;
}): RewindPriorComparison {
  let returningItems = 0;
  for (const id of input.currentItemIds) {
    if (input.priorItemIds.has(id)) returningItems += 1;
  }
  return {
    total: input.priorTotal,
    deltaPct:
      input.priorTotal > 0
        ? Math.round(((input.total - input.priorTotal) / input.priorTotal) * 100)
        : null,
    newItems: input.currentItemIds.size - returningItems,
    returningItems,
    coverage: input.coverage,
  };
}

export function droppedOff(
  prior: PriorItemCount[],
  currentItemIds: Set<string>,
  limit = DROPPED_OFF_LIMIT,
): RewindTopItem[] {
  return prior
    .filter((item) => !currentItemIds.has(item.id))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({ id: item.id, name: item.name, count: item.count }));
}

export function commonExtras(input: {
  period: string;
  timeZone: string;
  events: RewindEvent[];
  prior: PriorItemCount[];
  priorStart: Date;
  earliestEventAt: Date | null;
}): RewindCommonExtras {
  const dayKeys = input.events.map((e) => zonedDayKey(e.at, input.timeZone));
  const currentItemIds = new Set(input.events.map((e) => e.itemId));
  const coverage =
    input.earliestEventAt != null && input.earliestEventAt <= input.priorStart;
  const priorTotal = input.prior.reduce((sum, item) => sum + item.count, 0);
  return {
    activeDays: new Set(dayKeys).size,
    longestStreakDays: longestStreakDays(dayKeys),
    longestGapDays: longestGapDays(dayKeys),
    busiestDay: busiestDay(
      input.events.map((e) => e.at),
      input.timeZone,
    ),
    monthly: monthlySeries(input.period, input.events, input.timeZone),
    prior: compareToPrior({
      total: input.events.length,
      priorTotal,
      currentItemIds,
      priorItemIds: new Set(input.prior.map((item) => item.id)),
      coverage,
    }),
    droppedOff: coverage ? droppedOff(input.prior, currentItemIds) : [],
  };
}
