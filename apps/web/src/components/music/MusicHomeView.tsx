"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@questorylabs/qhttp/react";
import type {
  MusicBreakdownResponse,
  MusicInsights,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, SkeletonStatGrid, SkeletonTileGrid, StateMessage } from "@/components/ui";
import {
  formatDeltaPct,
  formatMinutes,
  formatShare,
  musicFetch,
} from "@/lib/music";
import { withTz } from "@/lib/dates";

export function MusicHomeView({ afterHeader }: { afterHeader?: ReactNode }) {
  const [range, setRange] = useState<MusicRange>("week");

  const insights = useQuery({
    queryKey: ["music-insights", range],
    queryFn: () =>
      musicFetch<MusicInsights>(
        withTz(`/analytics/insights?range=${range}`),
      ),
  });
  const hour = useQuery({
    queryKey: ["music-ts-hour", range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
  });
  const dow = useQuery({
    queryKey: ["music-ts-dow", range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
  });
  const years = useQuery({
    queryKey: ["music-years", range],
    queryFn: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/years?range=${range}&limit=16`,
      ),
  });
  const services = useQuery({
    queryKey: ["music-services", range],
    queryFn: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/services?range=${range}&limit=10`,
      ),
  });

  const hourData = useMemo(
    () =>
      (hour.data || []).map((b) => ({
        label: b.key,
        count: b.count,
      })),
    [hour.data],
  );
  const dowData = useMemo(
    () =>
      (dow.data || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dow.data],
  );
  const yearData = useMemo(
    () =>
      (years.data?.items || [])
        .filter((i) => i.key !== "unknown")
        .slice()
        .reverse()
        .map((b) => ({ label: b.label, count: b.count })),
    [years.data],
  );

  const d = insights.data;

  return (
    <>
      <PageHeader
        title="Music"
        description="Listening pulse from your scrobbles — what's playing, when you listen, and what's shifting."
        actions={<MusicRangePicker value={range} onChange={setRange} />}
      />

      {afterHeader}

      {insights.isLoading && !insights.data ? (
        <>
          <SkeletonStatGrid count={6} className="mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" />
          <SkeletonTileGrid count={4} />
        </>
      ) : null}
      {insights.isError && (
        <StateMessage variant="error">Could not load music analytics.</StateMessage>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: "Listens",
                value: d.periodListens,
                hint:
                  d.compare.deltaPct != null
                    ? `${formatDeltaPct(d.compare.deltaPct)} vs prior`
                    : undefined,
              },
              {
                label: "Listening time",
                value: formatMinutes(d.listeningMinutes),
                hint:
                  d.durationCoverage < 100
                    ? `${d.durationCoverage}% coverage`
                    : undefined,
              },
              {
                label: "New artists",
                value: d.newArtists,
              },
              {
                label: "New tracks",
                value: d.newTracks,
              },
              {
                label: "Top track share",
                value: `${d.topTrackShare}%`,
              },
              {
                label: "Unique artists",
                value: d.uniqueArtists,
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              d.peakHour
                ? {
                    label: "Peak hour",
                    value: d.peakHour.label,
                    hint: `${d.peakHour.count} listens`,
                  }
                : null,
              d.peakDow
                ? {
                    label: "Peak day",
                    value: d.peakDow.label,
                    hint: `${d.peakDow.count} listens`,
                  }
                : null,
              d.topGenre
                ? {
                    label: "Top genre",
                    value: d.topGenre.name,
                    hint: `${d.topGenre.count} tagged`,
                  }
                : null,
              d.topMood
                ? {
                    label: "Top mood",
                    value: d.topMood.name,
                    hint: `${d.topMood.count} tagged`,
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
        <SketchChartPanel title="Hour of day" data={hourData} valueLabel="listens" />
        <SketchChartPanel title="Day of week" data={dowData} valueLabel="listens" />
        <SketchChartPanel title="Release years" data={yearData} valueLabel="listens" />
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Sources
          </h2>
          <ul className="mt-3 space-y-2">
            {(services.data?.items || []).map((item) => (
              <li
                key={item.key}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-[var(--ink)]">{item.label}</span>
                <span className="font-mono text-[11px] text-[var(--faint)]">
                  {item.count}
                  {services.data
                    ? ` · ${formatShare(item.count, services.data.periodListens)}`
                    : ""}
                </span>
              </li>
            ))}
            {(services.data?.items || []).length === 0 ? (
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
