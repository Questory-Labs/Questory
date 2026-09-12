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
      className="pointer-events-none absolute top-1 z-10 rounded border border-[var(--line)] bg-[var(--bg-1)] px-3 py-2 font-mono text-[10px] text-[var(--ink)]"
      style={{
        left: `${Math.min(Math.max(xPct, 14), 86)}%`,
        transform: "translateX(-50%)",
      }}
    >
      {children}
    </div>
  );
};
