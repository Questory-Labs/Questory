"use client";

import type { SeriesConfig } from "./types";

/** Stacked bars or areas — scaffold for review histogram. */
export function StackedChart({
  data: _data,
  series: _series,
}: {
  data: Record<string, string | number>[];
  series: SeriesConfig[];
  variant?: "bar" | "area";
  ariaLabel?: string;
}) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Stacked chart not yet wired.
    </p>
  );
}
