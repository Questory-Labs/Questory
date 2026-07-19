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
  MusicBreakdownResponse,
  MusicInsights,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import {
  formatDeltaPct,
  formatMinutes,
  formatShare,
  musicFetch,
} from "@/lib/music";

const TOOLTIP_INK = "#f2efe8";

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

export default function MusicInsightsPage() {
  const [range, setRange] = useState<MusicRange>("week");

  const insights = useQuery({
    queryKey: ["music-insights", range],
    queryFn: () =>
      musicFetch<MusicInsights>(`/analytics/insights?range=${range}`),
  });
  const hour = useQuery({
    queryKey: ["music-ts-hour", range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        `/analytics/timeseries?granularity=hourOfDay&range=${range}`,
      ),
  });
  const dow = useQuery({
    queryKey: ["music-ts-dow", range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        `/analytics/timeseries?granularity=dayOfWeek&range=${range}`,
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
        title="Insights"
        description="Patterns across when you listen, what you discover, and where scrobbles come from."
        actions={<MusicRangePicker value={range} onChange={setRange} />}
      />

      {insights.isLoading && (
        <StateMessage variant="loading">Loading insights…</StateMessage>
      )}
      {insights.isError && (
        <StateMessage variant="error">Could not load insights.</StateMessage>
      )}

      {d && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
              <Panel key={card.label} className="p-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  {card.label}
                </dt>
                <dd className="mt-1 text-xl tabular-nums text-[var(--ink)]">
                  {card.value}
                </dd>
                {card.hint ? (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {card.hint}
                  </p>
                ) : null}
              </Panel>
            ))}
          </dl>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              d.peakHour
                ? {
                    label: "Peak hour (UTC)",
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
                <Panel key={card!.label} className="p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                    {card!.label}
                  </p>
                  <p className="mt-1 truncate text-lg text-[var(--ink)]">
                    {card!.value}
                  </p>
                  {card!.hint ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {card!.hint}
                    </p>
                  ) : null}
                </Panel>
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
