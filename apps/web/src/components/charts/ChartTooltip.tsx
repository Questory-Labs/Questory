"use client";

import type { ReactNode } from "react";
import { CHART_TOOLTIP_GAP_PX } from "@/lib/charts";

/** Hover label anchored to a chart cell, not the chart center. */
export function ChartTooltip({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: ReactNode;
}) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-[var(--line-strong)] bg-[var(--bg-0)] px-3 py-2 font-mono text-[10px] text-[var(--ink)]"
      style={{ left: x, top: y - CHART_TOOLTIP_GAP_PX }}
    >
      {children}
    </div>
  );
}
