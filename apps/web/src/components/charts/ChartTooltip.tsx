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
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-1)]/95 px-3 py-2 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md font-mono text-[10px] text-[var(--ink)]"
      style={{ left: x, top: y - CHART_TOOLTIP_GAP_PX }}
    >
      {children}
    </div>
  );
}
