"use client";

import type { ScatterPoint } from "./types";

/** X/Y correlation chart — scaffold for cost ROI. */
export function ScatterChart({
  points: _points,
}: {
  points: ScatterPoint[];
  ariaLabel?: string;
}) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Scatter chart not yet wired.
    </p>
  );
}
