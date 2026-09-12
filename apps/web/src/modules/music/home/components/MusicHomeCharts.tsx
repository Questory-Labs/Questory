"use client";

import { useMemo } from "react";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { Panel } from "@/components/ui";
import { HourDowSources } from "@/components/media/HourDowSources";
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
> & {
  peakCaption?: string;
};

export const MusicHomeCharts = ({
  heatmap,
  daySeries,
  hour,
  dow,
  years,
  services,
  showCalendar,
  peakCaption,
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

  return (
    <div className="mt-8 space-y-6">
      <ChartStatus
        failed={heatmap.failed}
        empty={heatmap.empty}
        title="When you listen"
        error="Could not load listening heatmap."
      >
        <Panel size="lg" className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            When you listen
          </h2>
          {peakCaption ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{peakCaption}</p>
          ) : null}
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
              <CalendarHeatmap days={calendarDays} ariaLabel="Listens per day" />
            </div>
          </Panel>
        </ChartStatus>
      ) : null}

      <HourDowSources
        hour={hour}
        dow={dow}
        extra={years}
        sources={services}
        extraTitle="Release years"
        hourError="Could not load hour-of-day listens."
        dowError="Could not load day-of-week listens."
        extraError="Could not load release years."
        sourcesError="Could not load music sources."
        hourData={hour.value || []}
        dowData={dow.value || []}
        extraData={(years.value?.items || [])
          .filter((i) => i.key !== "unknown")
          .slice()
          .reverse()}
        sourceItems={services.value?.items || []}
        valueLabel="listens"
        periodTotal={services.value?.periodListens ?? 0}
        formatShare={formatShare}
      />
    </div>
  );
};
