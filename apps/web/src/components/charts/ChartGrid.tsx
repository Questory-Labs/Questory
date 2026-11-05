import type { ReactNode } from "react";
import type { ChartPadding } from "./types";

const stroke = {
  stroke: "currentColor",
  vectorEffect: "non-scaling-stroke" as const,
};

export const ChartGrid = ({
  width,
  pad,
  plotH,
  yTicks,
  yMax,
  baseline,
}: {
  width: number;
  pad: ChartPadding;
  plotH: number;
  yTicks: number[];
  yMax: number;
  baseline: number;
}) => {
  const x1 = pad.left;
  const x2 = width - pad.right;
  return (
    <g className="text-[var(--line)]" aria-hidden>
      {yTicks.map((tick) => {
        const y = pad.top + plotH - (tick / Math.max(yMax, 1)) * plotH;
        return (
          <line
            key={tick}
            x1={x1}
            x2={x2}
            y1={y}
            y2={y}
            strokeWidth={1}
            {...stroke}
          />
        );
      })}
      <line
        x1={x1}
        x2={x2}
        y1={baseline}
        y2={baseline}
        className="text-[var(--line-strong)]"
        strokeWidth={1}
        {...stroke}
      />
    </g>
  );
};

export const ChartDot = ({ x, y }: { x: number; y: number }) => (
  <circle
    cx={x}
    cy={y}
    r="3.6"
    fill="#ffffff"
    className="drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
  />
);

export const ChartHoverMarker = ({
  x,
  y,
  top,
  bottom,
}: {
  x: number;
  y: number;
  top: number;
  bottom: number;
}) => (
  <>
    <line
      x1={x}
      y1={top}
      x2={x}
      y2={bottom}
      stroke="var(--ink)"
      strokeOpacity="0.3"
      strokeDasharray="3 4"
      vectorEffect="non-scaling-stroke"
    />
    <ChartDot x={x} y={y} />
  </>
);

export const ChartHoverCard = ({
  xPct,
  children,
}: {
  xPct: number;
  children: ReactNode;
}) => {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-1 z-10 rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-1)]/95 px-3 py-2 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md font-mono text-[10px] text-[var(--ink)]"
      style={
        xPct < 50
          ? { left: `calc(${xPct}% + 12px)` }
          : { left: `calc(${xPct}% - 12px)`, transform: "translateX(-100%)" }
      }
    >
      {children}
    </div>
  );
};
