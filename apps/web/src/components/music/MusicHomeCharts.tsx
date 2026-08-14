"use client";

import { useMemo } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { Panel, SkeletonChart, StateMessage } from "@/components/ui";
import { CALENDAR_HEATMAP_RANGES } from "@/lib/charts";
import { withTz } from "@/lib/dates";
import { formatShare, musicFetch } from "@/lib/music";

export function MusicHomeCharts({ range }: { range: MusicRange }) {
  const showCalendar = CALENDAR_HEATMAP_RANGES.has(range);

  const heatmap = useResource({
    id: ["music-heatmap", range],
    load: () =>
      musicFetch<MusicHeatmap>(withTz(`/analytics/heatmap?range=${range}`)),
  });
  const daySeries = useResource({
    id: ["music-ts-day", range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=day&range=${range}`),
      ),
    when: showCalendar,
  });
  const hour = useResource({
    id: ["music-ts-hour", range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=hourOfDay&range=${range}`),
      ),
  });
  const dow = useResource({
    id: ["music-ts-dow", range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=dayOfWeek&range=${range}`),
      ),
  });
  const years = useResource({
    id: ["music-years", range],
    load: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/years?range=${range}&limit=16`,
      ),
  });
  const services = useResource({
    id: ["music-services", range],
    load: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/services?range=${range}&limit=10`,
      ),
  });

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
      <Panel className="p-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          When you listen
        </h2>
        <div className="mt-3">
          {heatmap.empty && !heatmap.value ? (
            <SkeletonChart height={168} />
          ) : heatmap.failed ? (
            <StateMessage variant="error">
              Could not load listening heatmap.
            </StateMessage>
          ) : (
            <HeatmapChart
              cells={clockCells}
              dayLabels={heatmap.value?.dayLabels ?? []}
              hourLabels={heatmap.value?.hourLabels ?? []}
              maxValue={heatmap.value?.maxCount}
              ariaLabel="Listening by day and hour"
            />
          )}
        </div>
      </Panel>

      {showCalendar ? (
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Listening calendar
          </h2>
          <div className="mt-3">
            {daySeries.empty && !daySeries.value ? (
              <SkeletonChart height={128} />
            ) : daySeries.failed ? (
              <StateMessage variant="error">
                Could not load listening calendar.
              </StateMessage>
            ) : (
              <CalendarHeatmap
                days={calendarDays}
                ariaLabel="Listens per day"
              />
            )}
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SketchChartPanel title="Hour of day" data={hourData} valueLabel="listens" />
        <SketchChartPanel title="Day of week" data={dowData} valueLabel="listens" />
        <SketchChartPanel title="Release years" data={yearData} valueLabel="listens" />
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
      </div>
    </div>
  );
}
