"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type { CostRoiRow, CostSummary } from "@questorylabs/shared";

type ValueTab = "paid" | "free";

const CHART_FILL = "#7dd3c0";
const CHART_MUTED = "#8fa3b5";
const BUCKET_COLORS = ["#7dd3c0", "#5bb8a8", "#c4a35a", "#c47c6c", "#8a7f9a"];

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

const CHART_TOOLTIP_INK = "#f2efe8";

function chartTooltipStyle() {
  return {
    background: "#1f1f24",
    border: "1px solid rgba(242, 239, 232, 0.12)",
    borderRadius: 8,
    color: CHART_TOOLTIP_INK,
    fontSize: 12,
  };
}

/** Recharts defaults item text to entry.color || '#000', which disappears on dark tooltips. */
function chartTooltipItemStyle() {
  return { color: CHART_TOOLTIP_INK };
}

function chartTooltipLabelStyle() {
  return { color: CHART_TOOLTIP_INK, fontWeight: 600 };
}

function HorizontalSpendChart({
  title,
  data,
  currency,
}: {
  title: string;
  data: { name: string; amount: number }[];
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] p-4">
      <h2 className="mb-4 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                stroke={CHART_MUTED}
                fontSize={11}
                tickFormatter={(v) => formatMoney(Number(v), currency)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                stroke={CHART_MUTED}
                fontSize={11}
                tickFormatter={(v: string) =>
                  v.length > 14 ? `${v.slice(0, 13)}…` : v
                }
              />
              <Tooltip
                contentStyle={chartTooltipStyle()}
                itemStyle={chartTooltipItemStyle()}
                labelStyle={chartTooltipLabelStyle()}
                formatter={(value: number | string) => [
                  formatMoney(Number(value), currency),
                  "Value",
                ]}
              />
              <Bar dataKey="amount" fill={CHART_FILL} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function CostPage() {
  const qc = useQueryClient();
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
  const refreshPrices = useMutation({
    mutationFn: () => api("/cost/refresh-prices", { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-summary"] });
      qc.invalidateQueries({ queryKey: ["cost-roi"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
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

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl"
            style={{ fontWeight: 700 }}
          >
            Cost Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Estimate-only library value from store / ITAD prices — not what you
            spent. Steam does not expose purchase history; we never ask you to
            enter prices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshPrices.mutate()}
          disabled={refreshPrices.isPending}
          className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-60"
        >
          {refreshPrices.isPending ? "Refreshing prices…" : "Refresh store prices"}
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <HorizontalSpendChart
            title="By genre"
            data={genreChart}
            currency={currency}
          />
          <HorizontalSpendChart
            title="By publisher"
            data={publisherChart}
            currency={currency}
          />
        </section>
      )}

      {(analytics.buckets.length > 0 || analytics.freeVsPaid.length > 0) && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] p-4">
            <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
              Value by playtime
            </h2>
            <p className="mb-4 text-xs text-[var(--faint)]">
              Where paid-library value sits by hours played
            </p>
            {analytics.buckets.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No priced games yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.buckets}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <XAxis dataKey="name" stroke={CHART_MUTED} fontSize={11} />
                    <YAxis
                      stroke={CHART_MUTED}
                      fontSize={11}
                      tickFormatter={(v) => formatMoney(Number(v), currency)}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle()}
                      itemStyle={chartTooltipItemStyle()}
                      labelStyle={chartTooltipLabelStyle()}
                      formatter={(value: number | string, _name, item) => {
                        const count = (
                          item?.payload as { count?: number } | undefined
                        )?.count;
                        return [
                          `${money(Number(value))}${
                            count != null ? ` · ${count} games` : ""
                          }`,
                          "Value",
                        ];
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {analytics.buckets.map((_, i) => (
                        <Cell
                          key={analytics.buckets[i].name}
                          fill={BUCKET_COLORS[i % BUCKET_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--line)] p-4">
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
                <div className="h-56 w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.freeVsPaid}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={84}
                        paddingAngle={3}
                      >
                        {analytics.freeVsPaid.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={i === 0 ? CHART_FILL : "#8a7f9a"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle()}
                        itemStyle={chartTooltipItemStyle()}
                        labelStyle={chartTooltipLabelStyle()}
                        formatter={(value: number | string, name) => [
                          `${value} games`,
                          String(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 text-sm">
                  {analytics.freeVsPaid.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          background: i === 0 ? CHART_FILL : "#8a7f9a",
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
          </div>
        </section>
      )}

      {analytics.unplayed.length > 0 && (
        <section className="mt-10">
          <h2
            className="mb-1 font-[family-name:var(--font-display)] text-2xl"
            style={{ fontWeight: 700 }}
          >
            Shelfware
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Highest-value paid games with zero playtime ·{" "}
            {money(analytics.unplayedValue)} tied up
          </p>
          <div className="space-y-2">
            {analytics.unplayed.map((row) => (
              <div
                key={row.appId}
                className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] px-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="shrink-0 font-mono text-[var(--muted)]">
                  {money(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2
            className="font-[family-name:var(--font-display)] text-2xl"
            style={{ fontWeight: 700 }}
          >
            Best value (lowest cost/hour)
          </h2>
          <ValueTabs value={bestTab} onChange={setBestTab} />
        </div>
        <div className="space-y-2">
          {bestValue.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {analytics.ranked.length === 0
                ? "Refresh store prices to rank games by value."
                : `No ${bestTab} games with playtime to rank.`}
            </p>
          )}
          {bestValue.map((row) => (
            <div
              key={row.appId}
              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] px-4 py-3 text-sm"
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
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2
            className="font-[family-name:var(--font-display)] text-2xl"
            style={{ fontWeight: 700 }}
          >
            Least value (highest cost/hour)
          </h2>
          <ValueTabs value={worstTab} onChange={setWorstTab} />
        </div>
        <div className="space-y-2">
          {worstValue.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {analytics.ranked.length === 0
                ? "Refresh store prices to rank games by value."
                : `No ${worstTab} games with playtime to rank.`}
            </p>
          )}
          {worstValue.map((row) => (
            <div
              key={row.appId}
              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] px-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate">{row.name}</span>
              <span className="shrink-0 text-right text-[var(--muted)]">
                <span className="text-[var(--ink)]">
                  {money(row.costPerHour)}/h
                </span>
                {" · "}
                {row.hours}h · {money(row.amount)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
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
