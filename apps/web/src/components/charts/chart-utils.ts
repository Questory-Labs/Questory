"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  CALENDAR_HEATMAP_MAX_WEEKS,
  CHART_X_TICK_MIN_GAP_PX,
} from "@/lib/charts";
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

/** Center of `target` in `root`'s padding-box coordinates. */
export function chartAnchorPoint(
  target: HTMLElement,
  root: HTMLElement,
): { x: number; y: number } {
  const targetRect = target.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  return {
    x: targetRect.left - rootRect.left + targetRect.width / 2,
    y: targetRect.top - rootRect.top,
  };
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

/** First + last, with enough stride that the last day does not sit on its neighbor. */
export function pickXTickIndices(length: number, targetCount = 7): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const step = Math.max(
    1,
    Math.round((length - 1) / Math.max(targetCount - 1, 1)),
  );
  const idx: number[] = [];
  for (let i = 0; i < length; i += step) idx.push(i);
  const last = length - 1;
  if (idx[idx.length - 1] !== last) {
    if (last - idx[idx.length - 1] < step) {
      idx[idx.length - 1] = last;
    } else {
      idx.push(last);
    }
  }
  return idx;
}

/**
 * First + last, then interiors only when their x is at least `minGap` from
 * the previous chosen tick. Time-mode series cluster at the right edge;
 * index sampling would stack those labels.
 */
export function pickXTickIndicesByPixel(
  xs: number[],
  minGap = CHART_X_TICK_MIN_GAP_PX,
): number[] {
  if (xs.length === 0) return [];
  if (xs.length === 1) return [0];
  const last = xs.length - 1;
  const chosen: number[] = [0];
  for (let i = 1; i < last; i += 1) {
    if (xs[i] - xs[chosen[chosen.length - 1]] >= minGap) {
      chosen.push(i);
    }
  }
  const prev = chosen[chosen.length - 1];
  if (xs[last] - xs[prev] < minGap) {
    if (chosen.length === 1) chosen.push(last);
    else chosen[chosen.length - 1] = last;
  } else {
    chosen.push(last);
  }
  return chosen;
}

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

  const xTickIdx = new Set(
    options.xMode === "time"
      ? pickXTickIndicesByPixel(points.map((p) => p.x))
      : pickXTickIndices(data.length),
  );

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

/** Monotone cubic (Fritsch–Carlson) — smooth without overshooting peaks. */
export function monotoneLinePath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }

  const tan = new Array<number>(n).fill(0);
  tan[0] = slope[0];
  tan[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    tan[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }

  for (let i = 0; i < n - 1; i += 1) {
    if (Math.abs(slope[i]) < 1e-12) {
      tan[i] = 0;
      tan[i + 1] = 0;
    } else {
      const a = tan[i] / slope[i];
      const b = tan[i + 1] / slope[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tan[i] = t * a * slope[i];
        tan[i + 1] = t * b * slope[i];
      }
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const c = dx[i] / 3;
    d += ` C ${p0.x + c} ${p0.y + tan[i] * c}, ${p1.x - c} ${p1.y + tan[i + 1] * c}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function monotoneAreaPath(
  points: Array<{ x: number; y: number }>,
  baseline: number,
): string {
  if (points.length === 0) return "";
  const line = monotoneLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

export function polarPoint(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function describeArc(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
  reverse = false,
) {
  const s = polarPoint(cx, cy, r, start);
  const e = polarPoint(cx, cy, r, end);
  const large = Math.abs(end - start) > Math.PI ? 1 : 0;
  const sweep = reverse ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}

/**
 * Closed donut wedge. A single subpath — never start the inner arc with `M`,
 * or the hole fills and slices gap.
 */
export function donutSlicePath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  start: number,
  end: number,
): string {
  const sweep = end - start;
  if (sweep >= Math.PI * 2 - 1e-6) {
    const mid = start + Math.PI;
    return `${donutSlicePath(cx, cy, innerRadius, outerRadius, start, mid)} ${donutSlicePath(cx, cy, innerRadius, outerRadius, mid, start + Math.PI * 2)}`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  const p0 = polarPoint(cx, cy, outerRadius, start);
  const p1 = polarPoint(cx, cy, outerRadius, end);
  const p2 = polarPoint(cx, cy, innerRadius, end);
  const p3 = polarPoint(cx, cy, innerRadius, start);
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${p3.x} ${p3.y}`,
    "Z",
  ].join(" ");
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
