"use client";

import { useMemo } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type {
  ReadBreakdownResponse,
  ReadInsights,
  ReadTimeBucket,
} from "@questorylabs/shared";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, SkeletonStatGrid, SkeletonTileGrid, StateMessage } from "@/components/ui";
import { formatDeltaPct, formatShare, readFetch } from "@/lib/read";
import { withTz } from "@/lib/dates";

export function ReadHomeView() {
  const insights = useResource({
    id: ["read-insights"],
    load: () =>
      readFetch<ReadInsights>(
        withTz(`/analytics/insights?range=all`),
      ),
  });
  const hour = useResource({
    id: ["read-ts-hour"],
    load: () =>
      readFetch<ReadTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=hourOfDay&range=all`,
        ),
      ),
  });
  const dow = useResource({
    id: ["read-ts-dow"],
    load: () =>
      readFetch<ReadTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=dayOfWeek&range=all`,
        ),
      ),
  });
  const formats = useResource({
    id: ["read-formats"],
    load: () =>
      readFetch<ReadBreakdownResponse>(
        `/analytics/breakdown/formats?range=all&limit=10`,
      ),
  });
  const sources = useResource({
    id: ["read-sources"],
    load: () =>
      readFetch<ReadBreakdownResponse>(
        `/analytics/breakdown/sources?range=all&limit=10`,
      ),
  });

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

      {insights.empty && !insights.value ? (
        <>
          <SkeletonStatGrid count={6} />
          <SkeletonTileGrid count={4} className="mt-6" />
        </>
      ) : null}
      {insights.failed && (
        <StateMessage variant="error">Could not load read analytics.</StateMessage>
      )}

      {d && (
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
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SketchChartPanel title="Hour of day" data={hourData} valueLabel="events" />
        <SketchChartPanel title="Day of week" data={dowData} valueLabel="events" />
        <SketchChartPanel title="Formats" data={formatData} valueLabel="events" />
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
      </div>
    </>
  );
}
