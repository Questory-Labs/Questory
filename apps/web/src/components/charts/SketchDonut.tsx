"use client";

import { useMemo } from "react";
import { donutSlicePath } from "./chart-utils";
import type { DonutDatum } from "./types";

const DEFAULT_COLORS = [
  "var(--accent)",
  "#8a7f9a",
  "#5bb8a8",
  "#c4a35a",
  "#c47c6c",
];

export const SketchDonut = ({
  data,
  ariaLabel,
  formatValue = (n) => n.toLocaleString(),
  innerRadius = 52,
  outerRadius = 84,
  center,
  centerCaption,
}: {
  data: DonutDatum[];
  ariaLabel: string;
  formatValue?: (n: number) => string;
  innerRadius?: number;
  outerRadius?: number;
  center?: string;
  centerCaption?: string;
}) => {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data],
  );

  const size = outerRadius * 2 + 16;
  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    if (total <= 0) return [];
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const slice = (d.value / total) * Math.PI * 2;
      const start = angle;
      angle += slice;
      const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      return { ...d, start, end: angle, color };
    });
  }, [data, total]);

  if (data.length === 0 || total <= 0) {
    return <p className="text-xs text-[var(--muted)]">No data yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-44 w-44 shrink-0 sm:h-52 sm:w-52"
        role="img"
        aria-label={ariaLabel}
      >
        <title>
          {data.map((d) => `${d.name}: ${formatValue(d.value)}`).join(", ")}
        </title>
        {segments.map((seg) => (
          <path
            key={seg.name}
            d={donutSlicePath(cx, cy, innerRadius, outerRadius, seg.start, seg.end)}
            fill={seg.color}
            stroke={seg.color}
            strokeWidth="1"
          />
        ))}
        {center ? (
          <>
            <text
              x={cx}
              y={centerCaption ? cy - 2 : cy + 5}
              textAnchor="middle"
              fill="var(--ink)"
              fontSize="20"
              fontWeight="700"
            >
              {center}
            </text>
            {centerCaption ? (
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="10"
              >
                {centerCaption}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
      <ul className="space-y-2 text-sm">
        {segments.map((seg) => (
          <li key={seg.name} className="flex items-center gap-3">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: seg.color }}
              aria-hidden
            />
            <span className="font-medium text-[var(--ink)]">
              {seg.name}: {formatValue(seg.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
