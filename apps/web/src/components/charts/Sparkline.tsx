"use client";

import { useMemo } from "react";
import type { SketchDatum } from "./types";

/** Tiny inline chart with no axes — StatCards and table rows. */
export function Sparkline({
  data,
  ariaLabel,
  width = 88,
  height = 28,
}: {
  data: number[] | SketchDatum[];
  ariaLabel: string;
  width?: number;
  height?: number;
}) {
  const values = useMemo(
    () => data.map((d) => (typeof d === "number" ? d : d.value)),
    [data],
  );

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = innerW / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + innerH - ((v - min) / span) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="overflow-visible text-[var(--accent)]"
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
