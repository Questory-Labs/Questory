"use client";

import { useMemo } from "react";
import { describeArc } from "./chart-utils";

/**
 * Single-metric arc. `ariaLabel` is required — gauges are not decorative.
 */
export const GaugeChart = ({
  value,
  max = 100,
  label,
  ariaLabel,
}: {
  value: number;
  max?: number;
  label?: string;
  ariaLabel: string;
}) => {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const size = 168;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const radius = 58;
  const start = Math.PI;
  const end = Math.PI + Math.PI * ratio;
  const track = describeArc(cx, cy, radius, Math.PI, 2 * Math.PI);
  const fill = ratio > 0 ? describeArc(cx, cy, radius, start, end) : "";

  const title = useMemo(
    () => `${ariaLabel}: ${value} of ${max}`,
    [ariaLabel, value, max],
  );

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size * 0.72}`}
        className="h-28 w-full max-w-[180px]"
        role="img"
        aria-label={ariaLabel}
      >
        <title>{title}</title>
        <path
          d={track}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {fill ? (
          <path
            d={fill}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      {label ? (
        <p className="mt-1 text-center text-xs text-[var(--muted)]">{label}</p>
      ) : null}
    </div>
  );
};
