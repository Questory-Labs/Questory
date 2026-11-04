"use client";

import { useMemo } from "react";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { Panel } from "@/components/ui";
import { HourDowSources } from "@/components/media/HourDowSources";
import { formatShare } from "@/lib/music";
import type { MusicHomeViewProps } from "../music.home.types";
import { DailyPlaysChart } from "./DailyPlaysChart";
import { DotHeatmap } from "./DotHeatmap";
import { TopArtistsCard } from "./TopArtistsCard";

type ChartsProps = Pick<
  MusicHomeViewProps,
  | "heatmap"
  | "topArtists"
  | "daySeries"
  | "hour"
  | "dow"
  | "years"
  | "services"
  | "showCalendar"
> & {
  dailyTarget: number | null;
  peakGenre: string | null;
};

export const MusicHomeCharts = ({
  heatmap,
  topArtists,
  dailyTarget,
  daySeries,
  hour,
  dow,
  years,
  services,
  showCalendar,
  peakGenre,
}: ChartsProps) => {
  const calendarDays = useMemo(
    () =>
      (daySeries.value || []).map((bucket) => ({
        date: bucket.key,
        value: bucket.count,
      })),
    [daySeries.value],
  );

  return (
    <div className="mt-3.5 space-y-3.5">
      <div className="flex flex-wrap gap-3.5">
        <div className="q-in min-w-0 flex-[1.6_1_560px] [--i:3]">
          <ChartStatus
            failed={heatmap.failed}
            empty={heatmap.empty}
            title="When you listen"
            error="Could not load listening heatmap."
          >
            <DotHeatmap heatmap={heatmap.value} caption={peakGenre} />
          </ChartStatus>
        </div>
        <div className="q-in min-w-0 flex-[1_1_300px] [--i:4]">
          <TopArtistsCard tops={topArtists} />
        </div>
      </div>

      <div className="q-in [--i:5]">
        <DailyPlaysChart buckets={daySeries.value || []} target={dailyTarget} />
      </div>

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
