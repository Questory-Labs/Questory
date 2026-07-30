"use client";

import type { HeatmapCell } from "./types";

/** Day × hour activity grid — scaffold for music track heatmap. */
export function HeatmapChart({
  cells: _cells,
  dayLabels: _dayLabels,
  hourLabels: _hourLabels,
}: {
  cells: HeatmapCell[];
  dayLabels: string[];
  hourLabels: string[];
  maxValue?: number;
  ariaLabel?: string;
}) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Heatmap not yet wired.
    </p>
  );
}
