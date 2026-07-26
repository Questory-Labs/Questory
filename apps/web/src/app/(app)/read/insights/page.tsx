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
  ReadBreakdownResponse,
  ReadInsights,
  ReadRange,
  ReadTimeBucket,
} from "@questorylabs/shared";
import { ReadRangePicker } from "@/components/read/ReadRangePicker";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { formatDeltaPct, formatShare, readFetch } from "@/lib/read";

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

export default function ReadInsightsPage() {
  const [range, setRange] = useState<ReadRange>("week");

  const insights = useQuery({
    queryKey: ["read-insights", range],
    queryFn: () =>
      readFetch<ReadInsights>(`/analytics/insights?range=${range}`),
  });
  const hour = useQuery({
    queryKey: ["read-ts-hour", range],
    queryFn: () =>
      readFetch<ReadTimeBucket[]>(
        `/analytics/timeseries?granularity=hourOfDay&range=${range}`,
      ),
  });
  const dow = useQuery({
    queryKey: ["read-ts-dow", range],
    queryFn: () =>
      readFetch<ReadTimeBucket[]>(
        `/analytics/timeseries?granularity=dayOfWeek&range=${range}`,
      ),
  });
  const formats = useQuery({
    queryKey: ["read-formats", range],
    queryFn: () =>
      readFetch<ReadBreakdownResponse>(
        `/analytics/breakdown/formats?range=${range}&limit=10`,
      ),
  });
  const sources = useQuery({
    queryKey: ["read-sources", range],
    queryFn: () =>
      readFetch<ReadBreakdownResponse>(
        `/analytics/breakdown/sources?range=${range}&limit=10`,
      ),
  });

  const hourData = useMemo(
    () => (hour.data || []).map((b) => ({ label: b.key, count: b.count })),
    [hour.data],
  );
  const dowData = useMemo(
    () => (dow.data || []).map((b) => ({ label: b.label, count: b.count })),
    [dow.data],
  );
  const formatData = useMemo(
    () =>
      (formats.data?.items || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [formats.data],
  );

  const d = insights.data;

  return (
    <>
      <PageHeader
        title="Insights"
        description="Patterns across when you read, formats, and genres."
        actions={<ReadRangePicker value={range} onChange={setRange} />}
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
                    label: "Peak hour (UTC)",
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
        <MiniBar title="Hour of day (UTC)" data={hourData} />
        <MiniBar title="Day of week" data={dowData} />
        <MiniBar title="Formats" data={formatData} />
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
                    ? ` · ${formatShare(item.count, sources.data.periodEvents)}`
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
