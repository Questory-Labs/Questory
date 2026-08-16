"use client";

import { useMemo, useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type {
  WatchBreakdownResponse,
  WatchInsights,
  WatchTimeBucket,
} from "@questorylabs/shared";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import {
  WatchMediaPicker,
  type WatchMediaFilter,
} from "@/components/watch/WatchMediaPicker";
import { WatchAddButton } from "@/components/watch/WatchAddButton";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, SkeletonStatGrid, SkeletonTileGrid, StateMessage } from "@/components/ui";
import {
  formatDeltaPct,
  formatMinutes,
  formatShare,
  watchFetch,
} from "@/lib/watch";
import { withTz } from "@/lib/dates";

function typeQuery(type: WatchMediaFilter): string {
  return type === "all" ? "" : `&type=${type}`;
}

export function WatchHomeView() {
  const [media, setMedia] = useState<WatchMediaFilter>("all");
  const typeQs = typeQuery(media);

  const insights = useResource({
    id: ["watch-insights", media],
    load: () =>
      watchFetch<WatchInsights>(
        withTz(`/analytics/insights?range=all${typeQs}`),
      ),
  });
  const hour = useResource({
    id: ["watch-ts-hour", media],
    load: () =>
      watchFetch<WatchTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=hourOfDay&range=all${typeQs}`,
        ),
      ),
  });
  const dow = useResource({
    id: ["watch-ts-dow", media],
    load: () =>
      watchFetch<WatchTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=dayOfWeek&range=all${typeQs}`,
        ),
      ),
  });
  const years = useResource({
    id: ["watch-years", media],
    load: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/years?range=all&limit=16${typeQs}`,
      ),
  });
  const sources = useResource({
    id: ["watch-sources", media],
    load: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/sources?range=all&limit=10${typeQs}`,
      ),
  });

  const hourData = useMemo(
    () =>
      (hour.value || []).map((b) => ({
        label: b.key,
        count: b.count,
      })),
    [hour.value],
  );
  const dowData = useMemo(
    () =>
      (dow.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
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

  const d = insights.value;
  const scopeLabel =
    media === "movie" ? "movies" : media === "show" ? "TV" : "watches";

  return (
    <>
      <PageHeader
        title="Watch"
        description={
          <p>
            Movie &amp; TV analytics from Trakt, Letterboxd CSV, AniList, and
            local player webhooks.
          </p>
        }
        actions={
          <div className="header-controls">
            <WatchAddButton />
            <WatchMediaPicker value={media} onChange={setMedia} />
          </div>
        }
      />

      {insights.empty && !insights.value ? (
        <>
          <SkeletonStatGrid count={6} />
          <SkeletonTileGrid count={4} className="mt-6" />
        </>
      ) : null}
      {insights.failed && (
        <StateMessage variant="error">Could not load watch analytics.</StateMessage>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                label: "Watches",
                value: d.periodWatches,
                hint:
                  d.compare.deltaPct != null
                    ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                    : undefined,
              },
              {
                label: "Watching time",
                value: formatMinutes(d.watchingMinutes),
                hint:
                  d.periodWatches > 0 && d.runtimeCoverage < 100
                    ? `${d.runtimeCoverage}% coverage`
                    : undefined,
              },
              {
                label: "New titles",
                value: d.newTitles,
              },
              {
                label: "Top title share",
                value: `${d.topTitleShare}%`,
              },
              {
                label: "Unique titles",
                value: d.uniqueTitles,
              },
            ].map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                hint={card.hint}
              />
            ))}
          </div>

          {media === "all" && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  Movies
                </h2>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <StatCard label="Watches" value={d.movieWatches} />
                  <StatCard
                    label="Time"
                    value={formatMinutes(d.movieMinutes)}
                  />
                  <StatCard label="Titles" value={d.uniqueMovies} />
                </div>
              </section>
              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  TV
                </h2>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <StatCard label="Watches" value={d.showWatches} />
                  <StatCard
                    label="Time"
                    value={formatMinutes(d.showMinutes)}
                  />
                  <StatCard label="Titles" value={d.uniqueShows} />
                </div>
              </section>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              d.peakHour
                ? {
                    label: "Peak hour",
                    value: d.peakHour.label,
                    hint: `${d.peakHour.count} ${scopeLabel}`,
                  }
                : null,
              d.peakDow
                ? {
                    label: "Peak day",
                    value: d.peakDow.label,
                    hint: `${d.peakDow.count} ${scopeLabel}`,
                  }
                : null,
              d.topGenre
                ? {
                    label: "Top genre",
                    value: d.topGenre.name,
                    hint: `${d.topGenre.count} tagged`,
                  }
                : null,
            ]
              .filter(Boolean)
              .map((card) => (
                <StatCard
                  key={card!.label}
                  label={card!.label}
                  value={card!.value}
                  hint={card!.hint}
                />
              ))}
          </div>
        </>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SketchChartPanel title="Hour of day" data={hourData} valueLabel="watches" />
        <SketchChartPanel title="Day of week" data={dowData} valueLabel="watches" />
        <SketchChartPanel title="Release years" data={yearData} valueLabel="watches" />
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Sources
          </h2>
          <ul className="mt-3 space-y-2">
            {(sources.value?.items || []).map((item) => (
              <li
                key={item.key}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-[var(--ink)]">{item.label}</span>
                <span className="font-mono text-[11px] text-[var(--faint)]">
                  {item.count}
                  {sources.value
                    ? ` · ${formatShare(item.count, sources.value.periodWatches)}`
                    : ""}
                </span>
              </li>
            ))}
            {(sources.value?.items || []).length === 0 ? (
              <li className="text-sm text-[var(--muted)]">
                No source metadata yet.
              </li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </>
  );
}
