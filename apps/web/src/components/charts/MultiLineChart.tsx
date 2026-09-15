"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChartGrid, ChartHoverCard } from "./ChartGrid";
import {
  CHART_HEIGHT,
  CHART_PAD,
  chartHeightClass,
  defaultXLabel,
  monotoneAreaPath,
  pickXTickIndices,
  monotoneLinePath,
  niceTicks,
  useChartWidth,
} from "./chart-utils";
import type { ChartSize, SeriesConfig, YAxisConfig } from "./types";

type MultiRow = Record<string, string | number>;

const DEFAULT_COLORS = [
  "var(--accent)",
  "#c4a35a",
  "#5bb8a8",
  "#8a9bb8",
  "#d4a27f",
];

export function MultiLineChart({
  data,
  series,
  yAxes = [{ id: "default", side: "left" }],
  ariaLabel = "Chart",
  size = "lg",
  formatXLabel = defaultXLabel,
}: {
  data: MultiRow[];
  series: SeriesConfig[];
  yAxes?: YAxisConfig[];
  ariaLabel?: string;
  size?: ChartSize;
  formatXLabel?: (label: string) => string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const width = useChartWidth(rootRef);

  const pad = CHART_PAD[size];
  const height = CHART_HEIGHT[size];

  const layout = useMemo(() => {
    const w = width > 0 ? width : 720;
    const plotW = w - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const axisMax = new Map<string, number>();
    for (const axis of yAxes) axisMax.set(axis.id, 1);
    for (const row of data) {
      for (const s of series) {
        const axisId = s.yAxisId ?? yAxes[0]?.id ?? "default";
        const val = Number(row[s.key] ?? 0);
        axisMax.set(axisId, Math.max(axisMax.get(axisId) ?? 1, val));
      }
    }

    const yTicksByAxis = new Map<string, number[]>();
    const yMaxByAxis = new Map<string, number>();
    for (const axis of yAxes) {
      const max = axisMax.get(axis.id) ?? 1;
      const ticks = niceTicks(max);
      yTicksByAxis.set(axis.id, ticks);
      yMaxByAxis.set(axis.id, ticks[ticks.length - 1]);
    }

    const pointsBySeries = series.map((s) => {
      const axisId = s.yAxisId ?? yAxes[0]?.id ?? "default";
      const yMax = yMaxByAxis.get(axisId) ?? 1;
      return data.map((row, i) => {
        const value = Number(row[s.key] ?? 0);
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
        const y = pad.top + plotH - (value / yMax) * plotH;
        return { x, y, value, label: String(row.label ?? "") };
      });
    });

    const xTickIdx = new Set(pickXTickIndices(data.length));

    const baseline = pad.top + plotH;
    const bandW = plotW / Math.max(data.length, 1);

    return {
      width: w,
      plotH,
      baseline,
      bandW,
      pad,
      yTicksByAxis,
      yMaxByAxis,
      pointsBySeries,
      xTickIdx,
      xPositions: data.map(
        (_, i) => pad.left + (i / Math.max(data.length - 1, 1)) * plotW,
      ),
    };
  }, [data, series, yAxes, width, pad, height]);

  if (data.length < 2) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough data yet.</p>
    );
  }

  const chartW = layout.width > 0 ? layout.width : 720;
  const H = height;
  const activeIdx = hover;
  const primaryAxis = yAxes[0];
  const primaryTicks =
    layout.yTicksByAxis.get(primaryAxis?.id ?? "default") ?? [0];
  const primaryMax =
    layout.yMaxByAxis.get(primaryAxis?.id ?? "default") ?? 1;

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
          {series.map((s, si) => (
            <linearGradient
              key={s.key}
              id={`${gid}-${si}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length]}
                stopOpacity="0.22"
              />
              <stop
                offset="100%"
                stopColor={s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length]}
                stopOpacity="0.02"
              />
            </linearGradient>
          ))}
        </defs>
        <ChartGrid
          width={chartW}
          pad={pad}
          plotH={layout.plotH}
          yTicks={primaryTicks}
          yMax={primaryMax}
          baseline={layout.baseline}
        />

        {series.map((s, si) => {
          const pts = layout.pointsBySeries[si];
          const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
          return (
            <g key={s.key}>
              {s.variant === "area" && pts.length > 1 ? (
                <path
                  d={monotoneAreaPath(pts, layout.baseline)}
                  fill={`url(#${gid}-${si})`}
                />
              ) : null}
              <path
                d={monotoneLinePath(pts)}
                fill="none"
                stroke={color}
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.strokeDasharray}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {yAxes.map((axis) => {
          const ticks = layout.yTicksByAxis.get(axis.id) ?? [];
          const yMax = layout.yMaxByAxis.get(axis.id) ?? 1;
          const xPos =
            axis.side === "right" ? chartW - pad.right + 10 : pad.left - 10;
          const anchor = axis.side === "right" ? "start" : "end";
          return ticks.map((tick) => {
            const y = pad.top + layout.plotH - (tick / yMax) * layout.plotH;
            return (
              <text
                key={`${axis.id}-y-${tick}`}
                x={xPos}
                y={y + 4}
                textAnchor={anchor}
                className="fill-[var(--faint)] font-mono text-[10px]"
              >
                {axis.formatTick ? axis.formatTick(tick) : tick.toLocaleString()}
              </text>
            );
          });
        })}

        {[...layout.xTickIdx].map((i) => {
          const x = layout.xPositions[i];
          const label = String(data[i]?.label ?? "");
          const anchor =
            i === 0 ? "start" : i === data.length - 1 ? "end" : "middle";
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={H - 10}
              textAnchor={anchor}
              className="fill-[var(--faint)] font-mono text-[10px]"
            >
              {formatXLabel(label)}
            </text>
          );
        })}

        {layout.xPositions.map((x, i) => (
          <rect
            key={`band-${i}`}
            x={x - layout.bandW / 2}
            y={pad.top}
            width={layout.bandW}
            height={layout.plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {activeIdx != null
          ? series.map((s, si) => {
              const pt = layout.pointsBySeries[si][activeIdx];
              if (!pt) return null;
              return (
                <circle
                  key={s.key}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="var(--bg-1)"
                  stroke={s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length]}
                  strokeWidth="1.75"
                />
              );
            })
          : null}
      </svg>

      {activeIdx != null ? (
        <ChartHoverCard xPct={(layout.xPositions[activeIdx] / chartW) * 100}>
          <div className="text-[var(--muted)]">
            {formatXLabel(String(data[activeIdx]?.label ?? ""))}
          </div>
          {series.map((s, si) => {
            const val = Number(data[activeIdx]?.[s.key] ?? 0);
            const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
            return (
              <div key={s.key} className="mt-0.5" style={{ color }}>
                {s.name}: {val.toLocaleString()}
              </div>
            );
          })}
        </ChartHoverCard>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-[var(--faint)]">
        {series.map((s, si) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4"
              style={{
                background: s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length],
              }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
