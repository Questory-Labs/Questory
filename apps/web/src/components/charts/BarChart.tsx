"use client";

import { useMemo, useRef, useState } from "react";
import { ChartGrid, ChartHoverCard } from "./ChartGrid";
import {
  buildLineLayout,
  chartHeightClass,
  defaultXLabel,
  useChartWidth,
} from "./chart-utils";
import type { ChartSize, SketchDatum } from "./types";

export type { SketchDatum };

export function BarChart({
  data,
  ariaLabel = "Chart",
  valueLabel = "value",
  formatXLabel = defaultXLabel,
  formatValue = (n) => n.toLocaleString(),
  formatYTick = (n) => n.toLocaleString(),
  size = "lg",
  xMode = "index",
  xLabelAngle,
}: {
  data: SketchDatum[];
  ariaLabel?: string;
  valueLabel?: string;
  formatXLabel?: (label: string) => string;
  formatValue?: (n: number) => string;
  formatYTick?: (n: number) => string;
  size?: ChartSize;
  xMode?: "index" | "time";
  xLabelAngle?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = useChartWidth(rootRef);

  const layout = useMemo(() => {
    const w = width > 0 ? width : 720;
    return buildLineLayout(data, w, { size, xMode, type: "bar" });
  }, [data, width, size, xMode]);

  if (data.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough activity yet.</p>
    );
  }

  const chartW = layout.width > 0 ? layout.width : 720;
  const H = layout.height;
  const { pad } = layout;
  const active = hover != null ? layout.points[hover] : null;
  const maxBarWidth = Math.min(layout.bandW * 0.62, 36);

  const maxLabelLength = Math.max(
    ...data.map((d) => formatXLabel(d.label).length),
    1,
  );
  const avgCharWidth = 6;
  const maxLabelWidth = maxLabelLength * avgCharWidth;

  let finalAngle = xLabelAngle;
  if (finalAngle === undefined) {
    finalAngle = maxLabelWidth > layout.bandW * 0.9 ? -45 : 0;
  }

  let maxChars = maxLabelLength;
  if (finalAngle === 0) {
    maxChars = Math.max(3, Math.floor((layout.bandW * 0.9) / avgCharWidth));
  } else if (finalAngle === -45) {
    const verticalSpace = pad.bottom - 16;
    const allowedWidth = verticalSpace * 1.414;
    maxChars = Math.max(3, Math.floor(allowedWidth / avgCharWidth));
  }

  const truncate = (text: string) =>
    text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

  const xLabelY = layout.baseline + (finalAngle !== 0 ? 12 : 16);

  return (
    <div ref={rootRef} className="relative w-full" data-sketch-chart>
      <svg
        viewBox={`0 0 ${chartW} ${H}`}
        className={`w-full select-none ${chartHeightClass(size)}`}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        preserveAspectRatio="none"
      >
        <ChartGrid
          width={chartW}
          pad={pad}
          plotH={layout.plotH}
          yTicks={layout.yTicks}
          yMax={layout.yMax}
          baseline={layout.baseline}
        />

        {layout.points.map((pt, i) => {
          const barHeight = Math.max(0, layout.baseline - pt.y);
          if (barHeight <= 0) return null;
          const x = pt.x - maxBarWidth / 2;
          const on = hover === i;
          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={pt.y}
              width={maxBarWidth}
              height={barHeight}
              fill="var(--accent)"
              opacity={on ? 1 : 0.72}
            />
          );
        })}

        {layout.yTicks.map((tick) => {
          const y =
            pad.top + layout.plotH - (tick / layout.yMax) * layout.plotH;
          return (
            <text
              key={`y-${tick}`}
              x={pad.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-[var(--faint)] font-mono text-[10px]"
            >
              {formatYTick(tick)}
            </text>
          );
        })}

        {[...layout.xTickIdx].map((i) => {
          const pt = layout.points[i];
          const anchor = i === 0 ? "start" : "middle";
          return (
            <text
              key={`x-${i}`}
              x={pt.x}
              y={xLabelY}
              textAnchor={finalAngle !== 0 ? "end" : anchor}
              transform={
                finalAngle !== 0
                  ? `rotate(${finalAngle}, ${pt.x}, ${xLabelY})`
                  : undefined
              }
              className="fill-[var(--faint)] font-mono text-[10px]"
            >
              {truncate(formatXLabel(pt.label))}
            </text>
          );
        })}

        {layout.points.map((pt, i) => (
          <rect
            key={`band-${i}`}
            x={pt.x - maxBarWidth / 2}
            y={pad.top}
            width={maxBarWidth}
            height={layout.plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {active ? (
        <ChartHoverCard xPct={(active.x / chartW) * 100}>
          <div className="text-[var(--muted)]">{active.label}</div>
          <div className="mt-0.5 text-[var(--accent)]">
            {formatValue(active.value)} {valueLabel}
          </div>
        </ChartHoverCard>
      ) : null}
    </div>
  );
}
