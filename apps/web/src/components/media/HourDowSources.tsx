"use client";

import type { ReactNode } from "react";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { Panel } from "@/components/ui";

type Statusy = { failed: boolean; empty: boolean };
type CountRow = { key?: string; label?: string; count: number };
type SourceItem = { key: string; label: string; count: number };

export const HourDowSources = ({
  hour,
  dow,
  extra,
  sources,
  hourTitle = "Hour of day",
  dowTitle = "Day of week",
  extraTitle,
  sourcesTitle = "Sources",
  hourError,
  dowError,
  extraError,
  sourcesError,
  hourData,
  dowData,
  extraData,
  sourceItems,
  valueLabel,
  periodTotal,
  formatShare,
}: {
  hour: Statusy;
  dow: Statusy;
  extra?: Statusy;
  sources: Statusy;
  hourTitle?: string;
  dowTitle?: string;
  extraTitle?: string;
  sourcesTitle?: string;
  hourError: string;
  dowError: string;
  extraError?: string;
  sourcesError: string;
  hourData: CountRow[];
  dowData: CountRow[];
  extraData?: CountRow[];
  sourceItems: SourceItem[];
  valueLabel: string;
  periodTotal: number;
  formatShare: (count: number, total: number) => string;
  extraPanel?: ReactNode;
}) => {
  const toChart = (rows: CountRow[]) =>
    rows.map((b) => ({ label: b.label ?? b.key ?? "", count: b.count }));

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <ChartStatus
        failed={hour.failed}
        empty={hour.empty}
        title={hourTitle}
        error={hourError}
      >
        <SketchChartPanel
          title={hourTitle}
          data={toChart(hourData)}
          valueLabel={valueLabel}
        />
      </ChartStatus>
      <ChartStatus
        failed={dow.failed}
        empty={dow.empty}
        title={dowTitle}
        error={dowError}
      >
        <SketchChartPanel
          title={dowTitle}
          data={toChart(dowData)}
          valueLabel={valueLabel}
          variant="bar"
        />
      </ChartStatus>
      {extra && extraTitle && extraError ? (
        <ChartStatus
          failed={extra.failed}
          empty={extra.empty}
          title={extraTitle}
          error={extraError}
        >
          <SketchChartPanel
            title={extraTitle}
            data={toChart(extraData ?? [])}
            valueLabel={valueLabel}
          />
        </ChartStatus>
      ) : null}
      <ChartStatus
        failed={sources.failed}
        empty={sources.empty}
        title={sourcesTitle}
        error={sourcesError}
      >
        <Panel variant="outline" className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            {sourcesTitle}
          </h2>
          <ul className="mt-3 space-y-3">
            {sourceItems.map((item) => {
              const pct = periodTotal
                ? Math.min(100, (item.count / periodTotal) * 100)
                : 0;
              return (
                <li key={item.key} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[var(--ink)]">{item.label}</span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                      {item.count}
                      {periodTotal
                        ? ` · ${formatShare(item.count, periodTotal)}`
                        : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 h-px overflow-hidden bg-[var(--line)]">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {sourceItems.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No source metadata yet.</li>
            ) : null}
          </ul>
        </Panel>
      </ChartStatus>
    </div>
  );
};
