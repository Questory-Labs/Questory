"use client";

import { useMemo, useRef, useState } from "react";
import { CHART_LINE_COLOR } from "@/lib/charts";
import { ChartDot, ChartGrid, ChartHoverCard, ChartHoverMarker } from "./ChartGrid";
import { bareChartPad, pickPeakPoints, straightLinePath } from "./bare-chart";
import { buildLineLayout, defaultXLabel, useChartWidth } from "./chart-utils";
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
  showYAxis = true,
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
  showYAxis?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = useChartWidth(rootRef);

  const layout = useMemo(() => {
    const w = width > 0 ? width : 720;
    return buildLineLayout(data, w, {
      size,
      xMode,
      pad: showYAxis ? undefined : bareChartPad(size),
    });
  }, [data, width, size, xMode, showYAxis]);

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
  const lineD = straightLinePath(layout.points);
  const peaks = pickPeakPoints(layout.points);

  return (
    <div ref={rootRef} className="relative w-full" data-sketch-chart>
      <svg
        viewBox={`0 0 ${chartW} ${H}`}
        className="w-full select-none overflow-visible"
        style={{ height: H }}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        preserveAspectRatio="none"
      >
        {showYAxis ? (
          <ChartGrid
            width={chartW}
            pad={pad}
            plotH={layout.plotH}
            yTicks={layout.yTicks}
            yMax={layout.yMax}
            baseline={layout.baseline}
          />
        ) : null}
        <path
          className="q-draw"
          pathLength={1}
          d={lineD}
          fill="none"
          stroke={CHART_LINE_COLOR}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {peaks.map((p, i) => (
          <ChartDot key={`peak-${i}`} x={p.x} y={p.y} />
        ))}

        {(showYAxis ? layout.yTicks : []).map((tick) => {
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
          <ChartHoverMarker
            x={active.x}
            y={active.y}
            top={pad.top}
            bottom={layout.baseline}
          />
        ) : null}
      </svg>

      {active ? (
        <ChartHoverCard xPct={(active.x / chartW) * 100}>
          <div className="text-[var(--muted)]">{formatXLabel(active.label)}</div>
          <div className="mt-0.5">
            {formatValue(active.value)} {valueLabel}
          </div>
        </ChartHoverCard>
      ) : null}
    </div>
  );
}
