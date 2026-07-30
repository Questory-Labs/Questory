"use client";

import type { SketchDatum } from "./types";

/** Vertical or horizontal ranked bars — scaffold for future use. */
export function BarChart({
  data: _data,
  layout: _layout = "vertical",
}: {
  data: SketchDatum[];
  layout?: "vertical" | "horizontal";
  ariaLabel?: string;
}) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Bar chart not yet wired — use LineChart for now.
    </p>
  );
}
