"use client";

import { Panel } from "@/components/ui";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import type { ChartSize, SketchDatum } from "./types";

export const SketchChartPanel = ({
  title,
  data,
  valueLabel,
  emptyMessage = "No data yet.",
  ariaLabel,
  size = "md",
  variant = "line",
  xLabelAngle,
  formatXLabel,
  formatValue,
  className,
}: {
  title: string;
  data: { label: string; count: number }[];
  valueLabel: string;
  emptyMessage?: string;
  ariaLabel?: string;
  size?: ChartSize;
  variant?: "line" | "bar";
  xLabelAngle?: number;
  formatXLabel?: (label: string) => string;
  formatValue?: (n: number) => string;
  className?: string;
}) => {
  const chartData: SketchDatum[] = data.map((d) => ({
    label: d.label,
    value: d.count,
  }));
  const Chart = variant === "bar" ? BarChart : LineChart;

  return (
    <Panel className={className ?? "q-lift p-5"}>
      <h2 className="text-[17px] font-normal">{title}</h2>
      {chartData.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{emptyMessage}</p>
      ) : (
        <div className="mt-3">
          <Chart
            data={chartData}
            valueLabel={valueLabel}
            ariaLabel={ariaLabel ?? title}
            size={size}
            xLabelAngle={xLabelAngle}
            showYAxis={false}
            formatXLabel={formatXLabel ?? ((l) => l)}
            formatValue={formatValue}
          />
        </div>
      )}
    </Panel>
  );
};
