import type { DashboardStats } from "@questorylabs/shared";
import {
  DASHBOARD_CHART,
  DASHBOARD_DAYS_PER_WEEK,
  DASHBOARD_GREETINGS,
  DASHBOARD_HOURS_PER_DAY,
  DASHBOARD_MONDAY_REFERENCE,
  DASHBOARD_TODAY_TICKS,
  type DashboardTimeRange,
} from "./steam.dashboard.constants";

type TimePlayed = NonNullable<DashboardStats["timePlayed"]>;

export type ChartPoint = { x: number; y: number; secs: number; index: number };

export type TimeChartModel = {
  path: string;
  avgY: number;
  avgLabel: string;
  peaks: ChartPoint[];
  ticks: { x: number; label: string }[];
  ariaLabel: string;
};

export type TimePlayedModel = {
  hours: number;
  avgPerDayHours: number | null;
  avgScope: string;
  deltaHours: number | null;
  chart: TimeChartModel | null;
};

export const greeting = (now: Date): string => {
  const hour = now.getHours();
  let label: string = DASHBOARD_GREETINGS[DASHBOARD_GREETINGS.length - 1]!.label;
  for (const g of DASHBOARD_GREETINGS) if (hour >= g.from) label = g.label;
  return label;
};

export const headerDate = (now: Date): string => {
  const day = now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day.replace(/,/g, "")} · ${time}`;
};

export const toHours = (secs: number): number => Math.round((secs / 3600) * 10) / 10;

export const weekdayIndex = (now: Date): number => (now.getDay() + 6) % DASHBOARD_DAYS_PER_WEEK;

const weekdayLabels = (): string[] =>
  Array.from({ length: DASHBOARD_DAYS_PER_WEEK }, (_, i) => {
    const d = new Date(DASHBOARD_MONDAY_REFERENCE);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  });

const pickPeaks = (points: ChartPoint[], perDay: boolean): ChartPoint[] => {
  const sorted = [...points].filter((p) => p.secs > 0).sort((a, b) => b.secs - a.secs);
  const out: ChartPoint[] = [];
  const days = new Set<number>();
  for (const p of sorted) {
    if (out.length >= DASHBOARD_CHART.peakCount) break;
    const day = Math.floor(p.index / DASHBOARD_HOURS_PER_DAY);
    if (perDay && days.has(day)) continue;
    days.add(day);
    out.push(p);
  }
  return out.sort((a, b) => a.index - b.index);
};

export const buildTimeChart = (
  series: number[],
  slots: number,
  perDay: boolean,
  ticks: { index: number; label: string }[],
  scope: string,
): TimeChartModel | null => {
  if (!series.length || slots < 2) return null;
  const max = Math.max(0, ...series);
  if (max <= 0) return null;
  const { width, height } = DASHBOARD_CHART;
  const step = width / (slots - 1);
  const scaleY = (secs: number) => +(height - (secs / max) * height * 0.92).toFixed(1);
  const points: ChartPoint[] = series.map((secs, index) => ({
    x: +(index * step).toFixed(1),
    y: scaleY(secs),
    secs,
    index,
  }));
  const avg = series.reduce((sum, v) => sum + v, 0) / series.length;
  const peaks = pickPeaks(points, perDay);
  return {
    path: points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(""),
    avgY: scaleY(avg),
    avgLabel: `avg ${Math.round(avg / 60)}m / h`,
    peaks,
    ticks: ticks.map((t) => ({ x: +(t.index * step).toFixed(1), label: t.label })),
    ariaLabel: `Hourly play time ${scope}${peaks.length ? `, peaking at ${Math.round(Math.max(...peaks.map((p) => p.secs)) / 60)} minutes in an hour` : ""}`,
  };
};

export const timePlayedModel = (
  timePlayed: TimePlayed,
  range: DashboardTimeRange,
  now: Date,
): TimePlayedModel => {
  const dayIdx = weekdayIndex(now);
  const hourIdx = dayIdx * DASHBOARD_HOURS_PER_DAY + now.getHours();
  const hourly = timePlayed.weekHourlySecs;
  if (range === "today") {
    const start = dayIdx * DASHBOARD_HOURS_PER_DAY;
    const series = hourly.slice(start, Math.min(hourly.length, hourIdx + 1));
    return {
      hours: toHours(timePlayed.todaySecs),
      avgPerDayHours: toHours(timePlayed.weekSecs / (dayIdx + 1)),
      avgScope: "a day this week",
      deltaHours: null,
      chart: buildTimeChart(
        series,
        DASHBOARD_HOURS_PER_DAY,
        false,
        DASHBOARD_TODAY_TICKS.map((h) => ({ index: h, label: String(h).padStart(2, "0") })),
        "today",
      ),
    };
  }
  if (range === "week") {
    const series = hourly.slice(0, Math.min(hourly.length, hourIdx + 1));
    return {
      hours: toHours(timePlayed.weekSecs),
      avgPerDayHours: toHours(timePlayed.weekSecs / (dayIdx + 1)),
      avgScope: "a day",
      deltaHours: toHours(timePlayed.weekSecs - timePlayed.priorWeekSecs),
      chart: buildTimeChart(
        series,
        DASHBOARD_HOURS_PER_DAY * DASHBOARD_DAYS_PER_WEEK,
        true,
        weekdayLabels().map((label, i) => ({ index: i * DASHBOARD_HOURS_PER_DAY, label })),
        "across the week",
      ),
    };
  }
  return {
    hours: toHours(timePlayed.monthSecs),
    avgPerDayHours: toHours(timePlayed.monthSecs / now.getDate()),
    avgScope: "a day this month",
    deltaHours: null,
    chart: null,
  };
};
