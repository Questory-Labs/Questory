"use client";

import { useMemo } from "react";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { Panel } from "@/components/ui";
import { formatShare } from "@/lib/music";
import type { MusicHomeViewProps } from "../music.home.types";

type ChartsProps = Pick<
  MusicHomeViewProps,
  | "heatmap"
  | "daySeries"
  | "hour"
  | "dow"
  | "years"
  | "services"
  | "showCalendar"
>;

export const MusicHomeCharts = ({
  heatmap,
  daySeries,
  hour,
  dow,
  years,
  services,
  showCalendar,
}: ChartsProps) => {
  const clockCells = useMemo(
    () =>
      (heatmap.value?.cells || []).map((cell) => ({
        day: cell.day,
        hour: cell.hour,
        value: cell.count,
      })),
    [heatmap.value],
  );
  const calendarDays = useMemo(
    () =>
      (daySeries.value || []).map((bucket) => ({
        date: bucket.key,
        value: bucket.count,
      })),
    [daySeries.value],
  );
  const hourData = useMemo(
    () => (hour.value || []).map((b) => ({ label: b.key, count: b.count })),
    [hour.value],
  );
  const dowData = useMemo(
    () => (dow.value || []).map((b) => ({ label: b.label, count: b.count })),
    [dow.value],
  );
  const yearData = useMemo(
    () =>
      (years.value?.items || [])
        .filter((i) => i.key !== "unknown")
        .slice()
        .reverse()
        .map((b) => ({ label: b.label, count: b.count })),
    [years.value],
  );

  return (
    <div className="mt-8 space-y-6">
      <ChartStatus
        failed={heatmap.failed}
        empty={heatmap.empty}
        title="When you listen"
        error="Could not load listening heatmap."
      >
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            When you listen
          </h2>
          <div className="mt-3">
            <HeatmapChart
              cells={clockCells}
              dayLabels={heatmap.value?.dayLabels ?? []}
              hourLabels={heatmap.value?.hourLabels ?? []}
              maxValue={heatmap.value?.maxCount}
              ariaLabel="Listening by day and hour"
            />
          </div>
        </Panel>
      </ChartStatus>

      {showCalendar ? (
        <ChartStatus
          failed={daySeries.failed}
          empty={daySeries.empty}
          title="Listening calendar"
          error="Could not load listening calendar."
        >
          <Panel className="p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Listening calendar
            </h2>
            <div className="mt-3">
              <CalendarHeatmap
                days={calendarDays}
                ariaLabel="Listens per day"
              />
            </div>
          </Panel>
        </ChartStatus>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartStatus
          failed={hour.failed}
          empty={hour.empty}
          title="Hour of day"
          error="Could not load hour-of-day listens."
        >
          <SketchChartPanel
            title="Hour of day"
            data={hourData}
            valueLabel="listens"
          />
        </ChartStatus>
        <ChartStatus
          failed={dow.failed}
          empty={dow.empty}
          title="Day of week"
          error="Could not load day-of-week listens."
        >
          <SketchChartPanel
            title="Day of week"
            data={dowData}
            valueLabel="listens"
          />
        </ChartStatus>
        <ChartStatus
          failed={years.failed}
          empty={years.empty}
          title="Release years"
          error="Could not load release years."
        >
          <SketchChartPanel
            title="Release years"
            data={yearData}
            valueLabel="listens"
          />
        </ChartStatus>
        <ChartStatus
          failed={services.failed}
          empty={services.empty}
          title="Sources"
          error="Could not load music sources."
        >
          <Panel className="p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Sources
            </h2>
            <ul className="mt-3 space-y-2">
              {(services.value?.items || []).map((item) => (
                <li
                  key={item.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--ink)]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {item.count}
                    {services.value
                      ? ` · ${formatShare(item.count, services.value.periodListens)}`
                      : ""}
                  </span>
                </li>
              ))}
              {(services.value?.items || []).length === 0 ? (
                <li className="text-sm text-[var(--muted)]">
                  No source metadata yet.
                </li>
              ) : null}
            </ul>
          </Panel>
        </ChartStatus>
      </div>
    </div>
  );
};
