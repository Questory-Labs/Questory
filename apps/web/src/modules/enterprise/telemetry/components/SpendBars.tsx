"use client";

import { useId } from "react";

const WIDTH = 480;
const HEIGHT = 96;
const MAX_BARS = 24;
const BAR_WIDTH = 12;

export const SpendBars = ({
  values,
  label,
}: {
  values: number[];
  label: string;
}) => {
  const gradientId = useId();
  const shown = values.slice(-MAX_BARS);
  const max = Math.max(0, ...shown);
  if (shown.length === 0 || max <= 0) return null;
  const step = WIDTH / MAX_BARS;
  const offset = WIDTH - shown.length * step;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className="h-24 min-w-0 flex-[2_1_360px] overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="[stop-color:var(--warm)]" />
          <stop
            offset="1"
            className="[stop-color:var(--warm)]"
            stopOpacity="0.2"
          />
        </linearGradient>
      </defs>
      {shown.map((value, i) => {
        const h = Math.max((value / max) * (HEIGHT - 6), value > 0 ? 4 : 0);
        return (
          <rect
            key={i}
            x={offset + i * step + (step - BAR_WIDTH) / 2}
            y={HEIGHT - h}
            width={BAR_WIDTH}
            height={h}
            rx={6}
            fill={value === max ? undefined : `url(#${gradientId})`}
            className={value === max ? "q-grow fill-[var(--ink)]" : "q-grow"}
            style={{ "--i": i } as React.CSSProperties}
          />
        );
      })}
    </svg>
  );
};
