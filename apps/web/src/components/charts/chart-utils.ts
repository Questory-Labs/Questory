"use client";

import { useEffect, useState, type RefObject } from "react";
import { CALENDAR_HEATMAP_MAX_WEEKS } from "@/lib/charts";
import type { ChartPadding, ChartSize, LinePoint, SketchDatum } from "./types";

export const CHART_HEIGHT: Record<ChartSize, number> = {
  sm: 144,
  md: 224,
  lg: 288,
};

export const CHART_PAD: Record<ChartSize, ChartPadding> = {
  sm: { top: 12, right: 20, bottom: 40, left: 44 },
  md: { top: 16, right: 28, bottom: 48, left: 52 },
  lg: { top: 20, right: 36, bottom: 56, left: 60 },
};

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = Math.max(1, Math.ceil(max / (count - 1)));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

export function shortDate(label: string): string {
  const d = new Date(label.includes("T") ? label : `${label}T12:00:00`);
  if (Number.isNaN(d.getTime())) return label;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function defaultXLabel(label: string): string {
  const d = new Date(label.includes("T") ? label : `${label}T12:00:00`);
  if (!Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(label)) {
    return shortDate(label);
  }
  return label;
}

export function readToken(
  root: HTMLElement | null,
  name: string,
  fallback: string,
): string {
  if (!root || typeof window === "undefined") return fallback;
  const value = getComputedStyle(root).getPropertyValue(name).trim();
  return value || fallback;
}

export function useChartWidth(
  ref: RefObject<HTMLElement | null>,
  min = 320,
): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = Math.max(Math.floor(el.clientWidth), min);
      setWidth((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min]);

  return width;
}

function parseTime(label: string): number {
  return Date.parse(label.includes("T") ? label : `${label}T12:00:00`);
}

export type LineLayout = {
  points: LinePoint[];
  curvePts: [number, number][];
  areaPath: string;
  yTicks: number[];
  yMax: number;
  plotH: number;
  baseline: number;
  xTickIdx: Set<number>;
  bandW: number;
  width: number;
  height: number;
  pad: ChartPadding;
};

export function buildLineLayout(
  data: SketchDatum[],
  width: number,
  options: {
    size?: ChartSize;
    xMode?: "index" | "time";
    pad?: ChartPadding;
    height?: number;
    type?: "line" | "bar";
  } = {},
): LineLayout {
  const size = options.size ?? "lg";
  const pad = options.pad ?? CHART_PAD[size];
  const height = options.height ?? CHART_HEIGHT[size];
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const baseline = pad.top + plotH;

  // Hooks in LineChart/BarChart call this before empty-state early returns.
  if (data.length === 0) {
    return {
      points: [],
      curvePts: [],
      areaPath: "",
      yTicks: [0],
      yMax: 1,
      plotH,
      baseline,
      xTickIdx: new Set(),
      bandW: plotW,
      width,
      height,
      pad,
    };
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const yTicks = niceTicks(maxVal);
  const yMax = yTicks[yTicks.length - 1];

  let xPositions: number[];
  if (options.xMode === "time" && data.length > 1) {
    const times = data.map((d) => parseTime(d.label));
    const t0 = times[0];
    const tSpan = Math.max(times[times.length - 1] - t0, 1);
    xPositions = times.map(
      (t) => pad.left + ((t - t0) / tSpan) * plotW,
    );
  } else {
    if (options.type === "bar") {
      xPositions = data.map(
        (_, i) => pad.left + ((i + 0.5) / Math.max(data.length, 1)) * plotW,
      );
    } else {
      xPositions = data.map(
        (_, i) => pad.left + (i / Math.max(data.length - 1, 1)) * plotW,
      );
    }
  }

  const points: LinePoint[] = data.map((d, i) => ({
    x: xPositions[i],
    y: pad.top + plotH - (d.value / yMax) * plotH,
    label: d.label,
    value: d.value,
  }));

  const curvePts = points.map((p) => [p.x, p.y] as [number, number]);
  const areaPath = [
    `M ${points[0].x} ${points[0].y}`,
    ...points.slice(1).map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${baseline}`,
    `L ${points[0].x} ${baseline}`,
    "Z",
  ].join(" ");

  const xTickIdx = new Set<number>();
  const step = Math.max(1, Math.round((data.length - 1) / 6));
  for (let i = 0; i < data.length; i += step) xTickIdx.add(i);
  xTickIdx.add(data.length - 1);

  return {
    points,
    curvePts,
    areaPath,
    yTicks,
    yMax,
    plotH,
    baseline,
    xTickIdx,
    bandW: plotW / Math.max(data.length, 1),
    width,
    height,
    pad,
  };
}

export function chartHeightClass(size: ChartSize): string {
  if (size === "sm") return "h-36";
  if (size === "md") return "h-56";
  return "h-64 sm:h-72";
}

export const HEATMAP_LEVEL_CLASS = [
  "bg-[var(--line)]",
  "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
  "bg-[color-mix(in_srgb,var(--accent)_45%,transparent)]",
  "bg-[color-mix(in_srgb,var(--accent)_70%,transparent)]",
  "bg-[var(--accent)]",
] as const;

/** Discrete 0–4 intensity for heatmap cells (`0` is empty). */
export function heatmapLevel(value: number, maxValue: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || maxValue <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / maxValue) * 4))) as
    | 1
    | 2
    | 3
    | 4;
}

export type CalendarDayCell = {
  date: string;
  value: number;
};

export type CalendarWeek = {
  days: CalendarDayCell[];
  monthLabel: string | null;
};

const DAY_MS = 86_400_000;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function utcFromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayKeyFromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(key: string, n: number): string {
  const date = utcFromDayKey(key);
  date.setUTCDate(date.getUTCDate() + n);
  return dayKeyFromUtc(date);
}

function monFirstIndex(key: string): number {
  return (utcFromDayKey(key).getUTCDay() + 6) % 7;
}

function monthShort(key: string): string {
  return utcFromDayKey(key).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

/** Mon-first week columns, padded to week bounds, capped to `maxWeeks`. */
export function buildCalendarGrid(
  days: { date: string; value: number }[],
  maxWeeks = CALENDAR_HEATMAP_MAX_WEEKS,
): CalendarWeek[] {
  const byDate = new Map<string, number>();
  for (const day of days) {
    if (!DAY_KEY_RE.test(day.date)) continue;
    byDate.set(day.date, (byDate.get(day.date) ?? 0) + day.value);
  }
  if (byDate.size === 0) return [];

  const keys = [...byDate.keys()].sort();
  const lastKey = keys[keys.length - 1];
  const firstKey = keys[0];

  let startKey = addUtcDays(firstKey, -monFirstIndex(firstKey));
  let endKey = addUtcDays(lastKey, 6 - monFirstIndex(lastKey));
  const paddedDays =
    (utcFromDayKey(endKey).getTime() - utcFromDayKey(startKey).getTime()) /
      DAY_MS +
    1;
  if (paddedDays / 7 > maxWeeks) {
    endKey = addUtcDays(lastKey, 6 - monFirstIndex(lastKey));
    startKey = addUtcDays(endKey, -(maxWeeks * 7 - 1));
  }

  const weeks: CalendarWeek[] = [];
  let cursor = startKey;
  while (cursor <= endKey) {
    const weekDays: CalendarDayCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = addUtcDays(cursor, i);
      weekDays.push({ date, value: byDate.get(date) ?? 0 });
    }
    const firstOfMonth = weekDays.find((d) => d.date.endsWith("-01"));
    const monthLabel =
      weeks.length === 0
        ? monthShort(weekDays[0].date)
        : firstOfMonth
          ? monthShort(firstOfMonth.date)
          : null;
    weeks.push({ days: weekDays, monthLabel });
    cursor = addUtcDays(cursor, 7);
  }
  return weeks;
}
