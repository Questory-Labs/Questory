"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildLineLayout,
  chartHeightClass,
  defaultXLabel,
  readToken,
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
  const svgRef = useRef<SVGSVGElement>(null);
  const sketchRef = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = useChartWidth(rootRef);

  const layout = useMemo(() => {
    const w = width > 0 ? width : 720;
    return buildLineLayout(data, w, { size, xMode, type: "bar" });
  }, [data, width, size, xMode]);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = sketchRef.current;
    const root = rootRef.current;
    if (!svg || !layer || data.length === 0 || layout.width <= 0) return;

    let cancelled = false;
    const { pad, width: chartW } = layout;

    void import("roughjs/bin/rough").then(({ default: rough }) => {
      if (cancelled) return;

      layer.replaceChildren();
      const rc = rough.svg(svg);
      const accent = readToken(root, "--accent", "#7dd3c0");
      const faint = readToken(root, "--faint", "#777168");
      const grid = readToken(root, "--line", "rgba(242, 239, 232, 0.12)");

      for (const tick of layout.yTicks) {
        const y =
          pad.top + layout.plotH - (tick / layout.yMax) * layout.plotH;
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
          {
            stroke: faint,
            strokeWidth: 1.5,
            roughness: 1.4,
          },
        ),
      );

      const maxBarWidth = Math.min(layout.bandW * 0.8, 60);

      layout.points.forEach((pt) => {
        const barHeight = layout.baseline - pt.y;
        if (barHeight <= 0) return;
        const x = pt.x - maxBarWidth / 2;
        layer.appendChild(
          rc.rectangle(x, pt.y, maxBarWidth, barHeight, {
            fill: accent,
            fillStyle: "hachure",
            fillWeight: 0.7,
            hachureAngle: -45,
            hachureGap: 5,
            stroke: accent,
            strokeWidth: 0.8,
            roughness: 1.8,
          }),
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, [data, layout]);

  if (data.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)]">Not enough activity yet.</p>
    );
  }

  const chartW = layout.width > 0 ? layout.width : 720;
  const H = layout.height;
  const { pad } = layout;
  const active = hover != null ? layout.points[hover] : null;
  const maxBarWidth = Math.min(layout.bandW * 0.8, 60);

  const maxLabelLength = Math.max(...data.map((d) => formatXLabel(d.label).length), 1);
  const avgCharWidth = 6;
  const maxLabelWidth = maxLabelLength * avgCharWidth;

  let finalAngle = xLabelAngle;
  if (finalAngle === undefined) {
    if (maxLabelWidth > layout.bandW * 0.9) {
      finalAngle = -45;
    } else {
      finalAngle = 0;
    }
  }

  let maxChars = maxLabelLength;
  if (finalAngle === 0) {
    maxChars = Math.max(3, Math.floor((layout.bandW * 0.9) / avgCharWidth));
  } else if (finalAngle === -45) {
    const verticalSpace = pad.bottom - 16;
    const allowedWidth = verticalSpace * 1.414;
    maxChars = Math.max(3, Math.floor(allowedWidth / avgCharWidth));
  }

  const truncate = (text: string) => {
    if (text.length > maxChars) {
      return text.slice(0, maxChars - 1) + "…";
    }
    return text;
  };

  const xLabelY = layout.baseline + (finalAngle !== 0 ? 12 : 16);

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

        {active ? (
          <>
            <rect
              x={active.x - maxBarWidth / 2}
              y={pad.top}
              width={maxBarWidth}
              height={layout.plotH}
              fill="var(--accent)"
              opacity="0.1"
              pointerEvents="none"
            />
          </>
        ) : null}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute top-1 rounded border border-[var(--line-strong)] bg-[var(--bg-0)] px-3 py-2 font-mono text-[10px] text-[var(--ink)]"
          style={{
            left: `${Math.min(Math.max((active.x / chartW) * 100, 14), 86)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-[var(--muted)]">{active.label}</div>
          <div className="mt-0.5 text-[var(--accent)]">
            {formatValue(active.value)} {valueLabel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
