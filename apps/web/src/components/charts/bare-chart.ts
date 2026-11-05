import { CHART_PEAK_COUNT } from "@/lib/charts";
import { CHART_PAD } from "./chart-utils";
import type { ChartPadding, ChartSize } from "./types";

export function bareChartPad(size: ChartSize): ChartPadding {
  return { top: CHART_PAD[size].top, right: 6, bottom: 32, left: 6 };
}

export function straightLinePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
}

export function pickPeakPoints<T extends { value: number }>(
  points: T[],
  count = CHART_PEAK_COUNT,
): T[] {
  return points
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}
