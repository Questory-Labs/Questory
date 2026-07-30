"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "@/components/charts/LineChart";
import { SketchDonut } from "@/components/charts/SketchDonut";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type { CostRoiRow, CostSummary } from "@questorylabs/shared";

type ValueTab = "paid" | "free";

function matchesValueTab(row: CostRoiRow, tab: ValueTab) {
  return tab === "paid" ? row.amount > 0 : row.amount === 0;
}

function ValueTabs({
  value,
  onChange,
}: {
  value: ValueTab;
  onChange: (tab: ValueTab) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-[var(--line)] p-0.5 text-sm">
      {(["paid", "free"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded px-3 py-1 font-semibold capitalize transition ${
            value === tab
              ? "bg-[var(--bg-2)] text-[var(--ink)]"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function SpendChart({
  title,
  data,
  currency,
}: {
  title: string;
  data: { name: string; amount: number }[];
  currency: string;
}) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.amount - a.amount)
        .map((row) => ({ label: row.name, value: row.amount })),
    [data],
  );

  return (
    <Panel className="p-4">
      <h2 className="mb-4 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
        {title}
      </h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <LineChart
          data={chartData}
          ariaLabel={title}
          valueLabel="value"
          size="lg"
          formatXLabel={(l) => (l.length > 14 ? `${l.slice(0, 13)}…` : l)}
          formatValue={(n) => formatMoney(n, currency)}
          formatYTick={(n) => formatMoney(n, currency)}
        />
      )}
    </Panel>
  );
}

export default function CostPage() {
  const [bestTab, setBestTab] = useState<ValueTab>("paid");
  const [worstTab, setWorstTab] = useState<ValueTab>("paid");
  const summary = useQuery({
    queryKey: ["cost-summary"],
    queryFn: () => api<CostSummary>("/cost/summary"),
  });
  const roi = useQuery({
    queryKey: ["cost-roi"],
    queryFn: () => api<CostRoiRow[]>("/cost/roi"),
  });
  const s = summary.data;
  const rows = roi.data || [];

  const analytics = useMemo(() => {
    const ranked = rows.filter((r) => r.costPerHour != null);
    const paid = rows.filter((r) => r.amount > 0);
    const free = rows.filter((r) => r.amount === 0);
    const totalHours = round1(rows.reduce((sum, r) => sum + r.hours, 0));
    const unplayed = paid
      .filter((r) => r.hours === 0)
      .sort((a, b) => b.amount - a.amount);
    const unplayedValue = round2(unplayed.reduce((sum, r) => sum + r.amount, 0));
    const underOneHour = paid.filter((r) => r.hours > 0 && r.hours < 1);
    const underOneHourValue = round2(
      underOneHour.reduce((sum, r) => sum + r.amount, 0),
    );

    const buckets = [
      { name: "Unplayed", amount: unplayedValue, count: unplayed.length },
      {
        name: "< 1h",
        amount: underOneHourValue,
        count: underOneHour.length,
      },
      bucket(paid, "1–10h", (h) => h >= 1 && h < 10),
      bucket(paid, "10–50h", (h) => h >= 10 && h < 50),
      bucket(paid, "50h+", (h) => h >= 50),
    ].filter((b) => b.amount > 0 || b.count > 0);

    const freeVsPaid = [
      {
        name: "Paid",
        value: paid.length,
        amount: round2(paid.reduce((sum, r) => sum + r.amount, 0)),
      },
      { name: "Free", value: free.length, amount: 0 },
    ].filter((d) => d.value > 0);

    return {
      ranked,
      totalHours,
      unplayed: unplayed.slice(0, 10),
      unplayedValue,
      underOneHourCount: underOneHour.length,
      underOneHourValue,
      buckets,
      freeVsPaid,
      paidCount: paid.length,
      freeCount: free.length,
    };
  }, [rows]);

  const bestValue = analytics.ranked
    .filter((r) => matchesValueTab(r, bestTab))
    .slice(0, 20);
  const worstValue = [...analytics.ranked]
    .filter((r) => matchesValueTab(r, worstTab))
    .reverse()
    .slice(0, 10);

  const genreChart = (s?.byGenre || [])
    .slice(0, 10)
    .map((row) => ({ name: row.genre, amount: row.amount }));
  const publisherChart = (s?.byPublisher || [])
    .slice(0, 10)
    .map((row) => ({ name: row.publisher, amount: row.amount }));
  const currency = s?.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  const bucketChartData = analytics.buckets.map((b) => ({
    label: b.name,
    value: b.amount,
  }));

  return (
    <>
      <PageHeader
        title="Cost Analytics"
        description="Estimate-only library value from store / ITAD prices — not what you spent. Steam does not expose purchase history; we never ask you to enter prices."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Library value"
          value={s ? money(s.lifetimeAtCurrent) : "—"}
          hint={
            s
              ? `Lowest recorded: ${money(s.lifetimeAtLowest)} · ${s.pricedGameCount}/${s.librarySize} priced`
              : undefined
          }
        />
        <StatCard
          label="Cost / hour"
          value={s ? money(s.costPerHour) : "—"}
          hint={
            analytics.totalHours > 0
              ? `${analytics.totalHours.toLocaleString()}h played`
              : "Based on current store prices"
          }
        />
        <StatCard
          label="Money wasted"
          value={s ? money(s.moneyWasted) : "—"}
          hint={
            s
              ? `${s.neverPlayedCount} unplayed · ${s.underOneHourCount} under 1h`
              : undefined
          }
        />
        <StatCard
          label="Library mix"
          value={
            rows.length
              ? `${analytics.paidCount} / ${analytics.freeCount}`
              : "—"
          }
          hint="Paid · free (priced games)"
        />
      </div>

      {(genreChart.length > 0 || publisherChart.length > 0) && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <SpendChart title="By genre" data={genreChart} currency={currency} />
          <SpendChart
            title="By publisher"
            data={publisherChart}
            currency={currency}
          />
        </section>
      )}

      {(analytics.buckets.length > 0 || analytics.freeVsPaid.length > 0) && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <Panel className="p-4">
            <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
              Value by playtime
            </h2>
            <p className="mb-4 text-xs text-[var(--faint)]">
              Where paid-library value sits by hours played
            </p>
            {analytics.buckets.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No priced games yet.</p>
            ) : (
              <LineChart
                data={bucketChartData}
                ariaLabel="Value by playtime"
                valueLabel="value"
                size="lg"
                formatXLabel={(l) => l}
                formatValue={(n) => money(n)}
                formatYTick={(n) => money(n)}
              />
            )}
          </Panel>

          <Panel className="p-4">
            <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
              Paid vs free
            </h2>
            <p className="mb-4 text-xs text-[var(--faint)]">
              Count of priced games in your library
            </p>
            {analytics.freeVsPaid.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No priced games yet.</p>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-4 sm:flex-row">
                <SketchDonut
                  data={analytics.freeVsPaid.map((entry, i) => ({
                    name: entry.name,
                    value: entry.value,
                    color: i === 0 ? "#7dd3c0" : "#8a7f9a",
                  }))}
                  ariaLabel="Paid vs free library mix"
                  formatValue={(n) => `${n} games`}
                />
                <div className="space-y-3 text-sm">
                  {analytics.freeVsPaid.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          background: i === 0 ? "#7dd3c0" : "#8a7f9a",
                        }}
                      />
                      <div>
                        <div className="font-semibold text-[var(--ink)]">
                          {entry.name}: {entry.value}
                        </div>
                        {entry.amount > 0 && (
                          <div className="text-xs text-[var(--muted)]">
                            {money(entry.amount)} library value
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </section>
      )}

      {analytics.unplayed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 font-display text-2xl font-bold tracking-tight">
            Shelfware
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Highest-value paid games with zero playtime ·{" "}
            {money(analytics.unplayedValue)} tied up
          </p>
          <div className="space-y-2">
            {analytics.unplayed.map((row) => (
              <Panel
                key={row.appId}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="shrink-0 font-mono text-[var(--muted)]">
                  {money(row.amount)}
                </span>
              </Panel>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Best value (lowest cost/hour)
          </h2>
          <ValueTabs value={bestTab} onChange={setBestTab} />
        </div>
        <div className="space-y-2">
          {bestValue.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {analytics.ranked.length === 0
                ? "Price data will appear after the next store sync."
                : `No ${bestTab} games with playtime to rank.`}
            </p>
          )}
          {bestValue.map((row) => (
            <Panel
              key={row.appId}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate">{row.name}</span>
              <span className="shrink-0 text-right text-[var(--muted)]">
                <span className="text-[var(--ink)]">{money(row.costPerHour)}/h</span>
                {" · "}
                {row.hours}h · {money(row.amount)}
                {row.lowestPrice != null && (
                  <span className="block text-xs text-[var(--faint)]">
                    Now {money(row.currentPrice)} · Low {money(row.lowestPrice)}
                  </span>
                )}
              </span>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Least value (highest cost/hour)
          </h2>
          <ValueTabs value={worstTab} onChange={setWorstTab} />
        </div>
        <div className="space-y-2">
          {worstValue.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {analytics.ranked.length === 0
                ? "Price data will appear after the next store sync."
                : `No ${worstTab} games with playtime to rank.`}
            </p>
          )}
          {worstValue.map((row) => (
            <Panel
              key={row.appId}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate">{row.name}</span>
              <span className="shrink-0 text-right text-[var(--muted)]">
                <span className="text-[var(--ink)]">
                  {money(row.costPerHour)}/h
                </span>
                {" · "}
                {row.hours}h · {money(row.amount)}
              </span>
            </Panel>
          ))}
        </div>
      </section>
    </>
  );
}

function bucket(
  rows: CostRoiRow[],
  name: string,
  pred: (hours: number) => boolean,
) {
  const matched = rows.filter((r) => pred(r.hours));
  return {
    name,
    amount: round2(matched.reduce((sum, r) => sum + r.amount, 0)),
    count: matched.length,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
