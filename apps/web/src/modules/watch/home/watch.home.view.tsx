"use client";

import { useMemo } from "react";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { StatCard } from "@/components/StatCard";
import { WatchAddButton } from "@/components/watch/WatchAddButton";
import { WatchMediaPicker } from "./components/WatchMediaPicker";
import {
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
  StateMessage,
} from "@/components/ui";
import { formatDeltaPct, formatMinutes, formatShare } from "@/lib/watch";
import type { WatchHomeViewProps } from "./watch.home.types";

export const WatchHomeView = (props: Record<string, unknown>) => {
  const { media, setMedia, insights, hour, dow, years, sources } =
    props as WatchHomeViewProps;

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

      <ResourceStatus
        failed={insights.failed}
        empty={insights.empty}
        loading={
          <>
            <SkeletonStatGrid count={6} />
            <SkeletonTileGrid count={4} className="mt-6" />
          </>
        }
        error={
          <StateMessage variant="error">
            Could not load watch analytics.
          </StateMessage>
        }
      >
        {d ? (
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
                { label: "New titles", value: d.newTitles },
                { label: "Top title share", value: `${d.topTitleShare}%` },
                { label: "Unique titles", value: d.uniqueTitles },
              ].map((card) => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                />
              ))}
            </div>

            {media === "all" ? (
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
            ) : null}

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
        ) : null}
      </ResourceStatus>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartStatus
          failed={hour.failed}
          empty={hour.empty}
          title="Hour of day"
          error="Could not load hour-of-day watches."
        >
          <SketchChartPanel
            title="Hour of day"
            data={hourData}
            valueLabel="watches"
          />
        </ChartStatus>
        <ChartStatus
          failed={dow.failed}
          empty={dow.empty}
          title="Day of week"
          error="Could not load day-of-week watches."
        >
          <SketchChartPanel
            title="Day of week"
            data={dowData}
            valueLabel="watches"
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
            valueLabel="watches"
          />
        </ChartStatus>
        <ChartStatus
          failed={sources.failed}
          empty={sources.empty}
          title="Sources"
          error="Could not load watch sources."
        >
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
        </ChartStatus>
      </div>
    </>
  );
};
