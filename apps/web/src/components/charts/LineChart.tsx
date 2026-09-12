"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChartGrid, ChartHoverCard } from "./ChartGrid";
import {
  buildLineLayout,
  chartHeightClass,
  defaultXLabel,
  monotoneAreaPath,
  monotoneLinePath,
  useChartWidth,
} from "./chart-utils";
import type { ChartSize, SketchDatum } from "./types";

export type { SketchDatum };

export function LineChart({
  data,
  ariaLabel = "Chart",
  valueLabel = "listens",
  formatXLabel = defaultXLabel,
  formatValue = (n) => n.toLocaleString(),
  formatYTick = (n) => n.toLocaleString(),
  size = "lg",
  xMode = "index",
  xLabelAngle = 0,
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
  const fillId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const width = useChartWidth(rootRef);

  const layout = useMemo(() => {
    const w = width > 0 ? width : 720;
    return buildLineLayout(data, w, { size, xMode });
  }, [data, width, size, xMode]);

  if (data.length < 2) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough activity yet.</p>
    );
  }

  const chartW = layout.width > 0 ? layout.width : 720;
  const H = layout.height;
  const { pad } = layout;
  const active = hover != null ? layout.points[hover] : null;
  const xLabelY = layout.baseline + (xLabelAngle !== 0 ? 12 : 16);
  const lineD = monotoneLinePath(layout.points);
  const areaD = monotoneAreaPath(layout.points, layout.baseline);

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
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <ChartGrid
          width={chartW}
          pad={pad}
          plotH={layout.plotH}
          yTicks={layout.yTicks}
          yMax={layout.yMax}
          baseline={layout.baseline}
        />
        <path d={areaD} fill={`url(#${fillId})`} />
        <path
          d={lineD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

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
          const anchor =
            i === 0 ? "start" : i === data.length - 1 ? "end" : "middle";
          return (
            <text
              key={`x-${i}`}
              x={pt.x}
              y={xLabelY}
              textAnchor={xLabelAngle !== 0 ? "end" : anchor}
              transform={
                xLabelAngle !== 0
                  ? `rotate(${xLabelAngle}, ${pt.x}, ${xLabelY})`
                  : undefined
              }
              className="fill-[var(--faint)] font-mono text-[10px]"
            >
              {formatXLabel(pt.label)}
            </text>
          );
        })}

        {layout.points.map((pt, i) => (
          <rect
            key={`band-${i}`}
            x={pt.x - layout.bandW / 2}
            y={pad.top}
            width={layout.bandW}
            height={layout.plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {active ? (
          <>
            <line
              x1={active.x}
              y1={pad.top}
              x2={active.x}
              y2={layout.baseline}
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="3.5"
              fill="var(--bg-1)"
              stroke="var(--accent)"
              strokeWidth="1.75"
            />
          </>
        ) : null}
      </svg>

      {active ? (
        <ChartHoverCard xPct={(active.x / chartW) * 100}>
          <div className="text-[var(--muted)]">{formatXLabel(active.label)}</div>
          <div className="mt-0.5 text-[var(--accent)]">
            {formatValue(active.value)} {valueLabel}
          </div>
        </ChartHoverCard>
      ) : null}
    </div>
  );
}
