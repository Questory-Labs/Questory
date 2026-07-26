"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  WatchBreakdownResponse,
  WatchInsights,
  WatchRange,
  WatchTimeBucket,
} from "@questorylabs/shared";
import {
  WatchMediaPicker,
  type WatchMediaFilter,
} from "@/components/watch/WatchMediaPicker";
import { WatchRangePicker } from "@/components/watch/WatchRangePicker";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import {
  formatDeltaPct,
  formatMinutes,
  formatShare,
  watchFetch,
} from "@/lib/watch";

const TOOLTIP_INK = "#f2efe8";

function typeQuery(type: WatchMediaFilter): string {
  return type === "all" ? "" : `&type=${type}`;
}

function chartTooltipStyle() {
  return {
    background: "#1f1f24",
    border: "1px solid rgba(242, 239, 232, 0.12)",
    borderRadius: 8,
    color: TOOLTIP_INK,
    fontSize: 12,
  };
}

function MiniBar({
  title,
  data,
}: {
  title: string;
  data: { label: string; count: number }[];
}) {
  return (
    <Panel className="p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="label"
                stroke="var(--faint)"
                fontSize={10}
                interval={0}
                angle={data.length > 12 ? -40 : 0}
                textAnchor={data.length > 12 ? "end" : "middle"}
                height={data.length > 12 ? 48 : 28}
              />
              <YAxis stroke="var(--faint)" fontSize={10} width={32} />
              <Tooltip
                contentStyle={chartTooltipStyle()}
                itemStyle={{ color: TOOLTIP_INK }}
                labelStyle={{ color: TOOLTIP_INK, fontWeight: 600 }}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export default function WatchInsightsPage() {
  const [range, setRange] = useState<WatchRange>("week");
  const [media, setMedia] = useState<WatchMediaFilter>("all");
  const typeQs = typeQuery(media);

  const insights = useQuery({
    queryKey: ["watch-insights", range, media],
    queryFn: () =>
      watchFetch<WatchInsights>(
        `/analytics/insights?range=${range}${typeQs}`,
      ),
  });
  const hour = useQuery({
    queryKey: ["watch-ts-hour", range, media],
    queryFn: () =>
      watchFetch<WatchTimeBucket[]>(
        `/analytics/timeseries?granularity=hourOfDay&range=${range}${typeQs}`,
      ),
  });
  const dow = useQuery({
    queryKey: ["watch-ts-dow", range, media],
    queryFn: () =>
      watchFetch<WatchTimeBucket[]>(
        `/analytics/timeseries?granularity=dayOfWeek&range=${range}${typeQs}`,
      ),
  });
  const years = useQuery({
    queryKey: ["watch-years", range, media],
    queryFn: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/years?range=${range}&limit=16${typeQs}`,
      ),
  });
  const sources = useQuery({
    queryKey: ["watch-sources", range, media],
    queryFn: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/sources?range=${range}&limit=10${typeQs}`,
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
  const scopeLabel =
    media === "movie" ? "movies" : media === "show" ? "TV" : "watches";

  return (
    <>
      <PageHeader
        title="Insights"
        description="Patterns across when you watch, what you discover, and where plays come from."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <WatchMediaPicker value={media} onChange={setMedia} />
            <WatchRangePicker value={range} onChange={setRange} />
          </div>
        }
      />

      {insights.isLoading && (
        <StateMessage variant="loading">Loading insights…</StateMessage>
      )}
      {insights.isError && (
        <StateMessage variant="error">Could not load insights.</StateMessage>
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
                    label: "Peak hour (UTC)",
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
        <MiniBar title="Hour of day (UTC)" data={hourData} />
        <MiniBar title="Day of week" data={dowData} />
        <MiniBar title="Release years" data={yearData} />
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Sources
          </h2>
          <ul className="mt-3 space-y-2">
            {(sources.data?.items || []).map((item) => (
              <li
                key={item.key}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-[var(--ink)]">{item.label}</span>
                <span className="font-mono text-[11px] text-[var(--faint)]">
                  {item.count}
                  {sources.data
                    ? ` · ${formatShare(item.count, sources.data.periodWatches)}`
                    : ""}
                </span>
              </li>
            ))}
            {(sources.data?.items || []).length === 0 ? (
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
