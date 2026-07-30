"use client";

import { Panel } from "@/components/ui";
import { LineChart } from "./LineChart";
import type { ChartSize, SketchDatum } from "./types";

export function SketchChartPanel({
  title,
  data,
  valueLabel,
  emptyMessage = "No data yet.",
  ariaLabel,
  size = "md",
  xLabelAngle,
  formatXLabel,
  formatValue,
  formatYTick,
  className,
}: {
  title: string;
  data: { label: string; count: number }[];
  valueLabel: string;
  emptyMessage?: string;
  ariaLabel?: string;
  size?: ChartSize;
  xLabelAngle?: number;
  formatXLabel?: (label: string) => string;
  formatValue?: (n: number) => string;
  formatYTick?: (n: number) => string;
  className?: string;
}) {
  const chartData: SketchDatum[] = data.map((d) => ({
    label: d.label,
    value: d.count,
  }));

  return (
    <Panel className={className ?? "p-4"}>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {title}
      </h2>
      {chartData.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{emptyMessage}</p>
      ) : (
        <div className="mt-3">
          <LineChart
            data={chartData}
            valueLabel={valueLabel}
            ariaLabel={ariaLabel ?? title}
            size={size}
            xLabelAngle={xLabelAngle ?? (data.length > 12 ? -40 : 0)}
            formatXLabel={formatXLabel ?? ((l) => l)}
          />
        </div>
      )}
    </Panel>
  );
}
