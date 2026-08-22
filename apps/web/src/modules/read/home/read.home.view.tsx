"use client";

import { useMemo } from "react";
import { ChartStatus } from "@/components/charts/ChartStatus";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { StatCard } from "@/components/StatCard";
import {
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonStatGrid,
  SkeletonTileGrid,
  StateMessage,
} from "@/components/ui";
import { formatDeltaPct, formatShare } from "@/lib/read";
import type { ReadHomeViewProps } from "./read.home.types";

export const ReadHomeView = (props: Record<string, unknown>) => {
  const { insights, hour, dow, formats, sources } = props as ReadHomeViewProps;

  const hourData = useMemo(
    () => (hour.value || []).map((b) => ({ label: b.key, count: b.count })),
    [hour.value],
  );
  const dowData = useMemo(
    () => (dow.value || []).map((b) => ({ label: b.label, count: b.count })),
    [dow.value],
  );
  const formatData = useMemo(
    () =>
      (formats.value?.items || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [formats.value],
  );

  const d = insights.value;

  return (
    <>
      <PageHeader
        title="Read"
        description="Manga, manhwa, and print analytics from AniList. Connect under Read → Sources."
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
            Could not load read analytics.
          </StateMessage>
        }
      >
        {d ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                {
                  label: "Events",
                  value: d.periodEvents,
                  hint:
                    d.compare.deltaPct != null
                      ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                      : undefined,
                },
                { label: "Chapters logged", value: d.chaptersLogged },
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

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                d.peakHour
                  ? {
                      label: "Peak hour",
                      value: d.peakHour.label,
                      hint: `${d.peakHour.count} events`,
                    }
                  : null,
                d.peakDow
                  ? {
                      label: "Peak day",
                      value: d.peakDow.label,
                      hint: `${d.peakDow.count} events`,
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
          error="Could not load hour-of-day events."
        >
          <SketchChartPanel
            title="Hour of day"
            data={hourData}
            valueLabel="events"
          />
        </ChartStatus>
        <ChartStatus
          failed={dow.failed}
          empty={dow.empty}
          title="Day of week"
          error="Could not load day-of-week events."
        >
          <SketchChartPanel
            title="Day of week"
            data={dowData}
            valueLabel="events"
          />
        </ChartStatus>
        <ChartStatus
          failed={formats.failed}
          empty={formats.empty}
          title="Formats"
          error="Could not load formats."
        >
          <SketchChartPanel
            title="Formats"
            data={formatData}
            valueLabel="events"
          />
        </ChartStatus>
        <ChartStatus
          failed={sources.failed}
          empty={sources.empty}
          title="Sources"
          error="Could not load read sources."
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
                      ? ` · ${formatShare(item.count, sources.value.periodEvents)}`
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
