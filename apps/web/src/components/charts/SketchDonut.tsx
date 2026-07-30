"use client";

import { useEffect, useMemo, useRef } from "react";
import { readToken } from "./chart-utils";
import type { DonutDatum } from "./types";

const DEFAULT_COLORS = ["#7dd3c0", "#8a7f9a", "#5bb8a8", "#c4a35a", "#c47c6c"];

export function SketchDonut({
  data,
  ariaLabel = "Donut chart",
  formatValue = (n) => n.toLocaleString(),
  innerRadius = 52,
  outerRadius = 84,
}: {
  data: DonutDatum[];
  ariaLabel?: string;
  formatValue?: (n: number) => string;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sketchRef = useRef<SVGGElement>(null);

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

  useEffect(() => {
    const svg = svgRef.current;
    const layer = sketchRef.current;
    const root = rootRef.current;
    if (!svg || !layer || segments.length === 0) return;

    let cancelled = false;

    void import("roughjs/bin/rough").then(({ default: rough }) => {
      if (cancelled) return;

      layer.replaceChildren();
      const rc = rough.svg(svg);
      const accent = readToken(root, "--accent", "#7dd3c0");

      for (const seg of segments) {
        const path = describeArc(cx, cy, outerRadius, seg.start, seg.end);
        const innerPath = describeArc(cx, cy, innerRadius, seg.end, seg.start, true);
        const d = `${path} L ${polar(cx, cy, innerRadius, seg.end).x} ${polar(cx, cy, innerRadius, seg.end).y} ${innerPath} Z`;

        layer.appendChild(
          rc.path(d, {
            fill: seg.color ?? accent,
            fillStyle: "hachure",
            fillWeight: 0.8,
            hachureAngle: 60,
            hachureGap: 4,
            stroke: seg.color ?? accent,
            strokeWidth: 1,
            roughness: 1.6,
          }),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [segments, cx, cy, innerRadius, outerRadius]);

  if (data.length === 0 || total <= 0) {
    return <p className="text-xs text-[var(--muted)]">No data yet.</p>;
  }

  return (
    <div ref={rootRef} className="flex justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        className="h-56 w-full max-w-[240px]"
        role="img"
        aria-label={ariaLabel}
      >
        <title>
          {data.map((d) => `${d.name}: ${formatValue(d.value)}`).join(", ")}
        </title>
        <g ref={sketchRef} />
      </svg>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
  reverse = false,
) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > Math.PI ? 1 : 0;
  const sweep = reverse ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}
