"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHART_HEIGHT,
  CHART_PAD,
  chartHeightClass,
  defaultXLabel,
  niceTicks,
  readToken,
  useChartWidth,
} from "./chart-utils";
import type { ChartSize, SeriesConfig, YAxisConfig } from "./types";

type MultiRow = Record<string, string | number>;

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
  const svgRef = useRef<SVGSVGElement>(null);
  const sketchRef = useRef<SVGGElement>(null);
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

    const xTickIdx = new Set<number>();
    const step = Math.max(1, Math.round((data.length - 1) / 6));
    for (let i = 0; i < data.length; i += step) xTickIdx.add(i);
    if (data.length > 0) xTickIdx.add(data.length - 1);

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

  useEffect(() => {
    const svg = svgRef.current;
    const layer = sketchRef.current;
    const root = rootRef.current;
    if (!svg || !layer || data.length < 2 || layout.width <= 0) return;

    let cancelled = false;
    const chartW = layout.width;

    void import("roughjs/bin/rough").then(({ default: rough }) => {
      if (cancelled) return;

      layer.replaceChildren();
      const rc = rough.svg(svg);
      const faint = readToken(root, "--faint", "#777168");
      const grid = readToken(root, "--line", "rgba(242, 239, 232, 0.12)");
      const defaultColors = ["#5bb8a8", "#c4a35a", "#7dd3c0", "#8a9bb8", "#d4a27f"];

      const primaryAxis = yAxes[0];
      const primaryTicks = layout.yTicksByAxis.get(primaryAxis?.id ?? "default") ?? [0];

      for (const tick of primaryTicks) {
        const yMax = layout.yMaxByAxis.get(primaryAxis?.id ?? "default") ?? 1;
        const y =
          pad.top + layout.plotH - (tick / yMax) * layout.plotH;
        layer.appendChild(
          rc.line(pad.left, y, chartW - pad.right, y, {
            stroke: grid,
            strokeWidth: 1,
            roughness: 0.9,
          }),
        );
      }

      layer.appendChild(
        rc.line(pad.left, pad.top - 6, pad.left, layout.baseline + 6, {
          stroke: faint,
          strokeWidth: 1.5,
          roughness: 1.4,
        }),
      );
      layer.appendChild(
        rc.line(
          pad.left - 4,
          layout.baseline,
          chartW - pad.right + 4,
          layout.baseline,
          { stroke: faint, strokeWidth: 1.5, roughness: 1.4 },
        ),
      );

      series.forEach((s, si) => {
        const pts = layout.pointsBySeries[si];
        const color =
          s.color ?? defaultColors[si % defaultColors.length];
        const curvePts = pts.map((p) => [p.x, p.y] as [number, number]);

        if (s.variant === "area" && pts.length > 1) {
          const areaPath = [
            `M ${pts[0].x} ${pts[0].y}`,
            ...pts.slice(1).map((p) => `L ${p.x} ${p.y}`),
            `L ${pts[pts.length - 1].x} ${layout.baseline}`,
            `L ${pts[0].x} ${layout.baseline}`,
            "Z",
          ].join(" ");
          layer.appendChild(
            rc.path(areaPath, {
              fill: color,
              fillStyle: "hachure",
              fillWeight: 0.6,
              hachureAngle: -45,
              hachureGap: 5,
              stroke: color,
              strokeWidth: 0.6,
              roughness: 1.6,
            }),
          );
        }

        layer.appendChild(
          rc.curve(curvePts, {
            stroke: color,
            strokeWidth: s.variant === "area" ? 2 : 2.2,
            roughness: 1.8,
            bowing: 1.1,
            strokeLineDash:
              s.strokeDasharray
                ?.split(" ")
                .map(Number)
                .filter((n) => !Number.isNaN(n)) ?? undefined,
          }),
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, [data, layout, series, yAxes, pad]);

  if (data.length < 2) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough data yet.</p>
    );
  }

  const chartW = layout.width > 0 ? layout.width : 720;
  const H = height;
  const activeIdx = hover;
  const defaultColors = ["#5bb8a8", "#c4a35a", "#7dd3c0", "#8a9bb8", "#d4a27f"];

  return (
    <div ref={rootRef} className="relative w-full" data-sketch-chart>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartW} ${H}`}
        className={`w-full select-none ${chartHeightClass(size)}`}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        preserveAspectRatio="none"
      >
        <g ref={sketchRef} />

        {yAxes.map((axis) => {
          const ticks = layout.yTicksByAxis.get(axis.id) ?? [];
          const yMax = layout.yMaxByAxis.get(axis.id) ?? 1;
          const xPos =
            axis.side === "right" ? chartW - pad.right + 10 : pad.left - 10;
          const anchor = axis.side === "right" ? "start" : "end";
          return ticks.map((tick) => {
            const y =
              pad.top + layout.plotH - (tick / yMax) * layout.plotH;
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
                  r="4"
                  fill="var(--bg-0)"
                  stroke={s.color ?? defaultColors[si % defaultColors.length]}
                  strokeWidth="2"
                />
              );
            })
          : null}
      </svg>

      {activeIdx != null ? (
        <div
          className="pointer-events-none absolute top-1 rounded border border-[var(--line-strong)] bg-[var(--bg-0)] px-3 py-2 font-mono text-[10px] text-[var(--ink)]"
          style={{
            left: `${Math.min(Math.max((layout.xPositions[activeIdx] / chartW) * 100, 14), 86)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-[var(--muted)]">
            {formatXLabel(String(data[activeIdx]?.label ?? ""))}
          </div>
          {series.map((s, si) => {
            const val = Number(data[activeIdx]?.[s.key] ?? 0);
            const color = s.color ?? defaultColors[si % defaultColors.length];
            return (
              <div key={s.key} className="mt-0.5" style={{ color }}>
                {s.name}: {val.toLocaleString()}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-[var(--faint)]">
        {series.map((s, si) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4"
              style={{
                background: s.color ?? defaultColors[si % defaultColors.length],
              }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
