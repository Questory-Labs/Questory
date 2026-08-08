"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@questorylabs/qhttp/react";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { SketchDonut } from "@/components/charts/SketchDonut";
import { StatCard } from "@/components/StatCard";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { COST_ROI_PAGE_SIZE } from "@/lib/pagination";
import type {
  CostRoiPage,
  CostRoiRow,
  CostRoiValueFilter,
  CostSummary,
} from "@questorylabs/shared";

type ValueTab = "paid" | "free";

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
          className={`rounded px-3 py-1 font-semibold capitalize transition ${value === tab
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
        <BarChart
          data={chartData}
          ariaLabel={title}
          valueLabel="value"
          size="lg"
          formatValue={(n) => formatMoney(n, currency)}
          formatYTick={(n) => formatMoney(n, currency, { compact: true })}
        />
      )}
    </Panel>
  );
}

function RoiPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="px-3 py-1.5"
      >
        Previous
      </Button>
      <span className="font-mono text-xs text-[var(--muted)]">
        {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="px-3 py-1.5"
      >
        Next
      </Button>
    </div>
  );
}

function RoiList({
  rows,
  currency,
  emptyMessage,
}: {
  rows: CostRoiRow[];
  currency: string;
  emptyMessage: string;
}) {
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
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
  );
}

export default function CostPage() {
  const [bestTab, setBestTab] = useState<ValueTab>("paid");
  const [worstTab, setWorstTab] = useState<ValueTab>("paid");
  const [bestPage, setBestPage] = useState(1);
  const [worstPage, setWorstPage] = useState(1);

  useEffect(() => {
    setBestPage(1);
  }, [bestTab]);

  useEffect(() => {
    setWorstPage(1);
  }, [worstTab]);

  const summary = useQuery({
    queryKey: ["cost-summary"],
    queryFn: () => api<CostSummary>("/cost/summary"),
  });
  const bestRoi = useQuery({
    queryKey: ["cost-roi", "best", bestTab, bestPage],
    queryFn: () =>
      api<CostRoiPage>(
        `/cost/roi?sort=best&value=${bestTab}&page=${bestPage}&pageSize=${COST_ROI_PAGE_SIZE}`,
      ),
  });
  const worstRoi = useQuery({
    queryKey: ["cost-roi", "worst", worstTab, worstPage],
    queryFn: () =>
      api<CostRoiPage>(
        `/cost/roi?sort=worst&value=${worstTab}&page=${worstPage}&pageSize=${COST_ROI_PAGE_SIZE}`,
      ),
  });

  const s = summary.data;
  const currency = s?.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  const genreChart = (s?.byGenre || [])
    .slice(0, 10)
    .map((row) => ({ name: row.genre, amount: row.amount }));
  const publisherChart = (s?.byPublisher || [])
    .slice(0, 10)
    .map((row) => ({ name: row.publisher, amount: row.amount }));

  const bucketChartData = (s?.playtimeBuckets || []).map((b) => ({
    label: b.name,
    value: b.amount,
  }));

  const freeVsPaid = s
    ? [
      {
        name: "Paid",
        value: s.libraryMix.paid.count,
        amount: s.libraryMix.paid.amount,
      },
      { name: "Free", value: s.libraryMix.free.count, amount: 0 },
    ].filter((d) => d.value > 0)
    : [];

  const bestTotalPages = Math.max(
    1,
    Math.ceil((bestRoi.data?.total ?? 0) / (bestRoi.data?.pageSize ?? COST_ROI_PAGE_SIZE)),
  );
  const worstTotalPages = Math.max(
    1,
    Math.ceil((worstRoi.data?.total ?? 0) / (worstRoi.data?.pageSize ?? COST_ROI_PAGE_SIZE)),
  );

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
            s && s.totalHours > 0
              ? `${s.totalHours.toLocaleString()}h played`
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
          value={s ? `${s.paidGameCount} / ${s.freeGameCount}` : "—"}
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

      {s && (s.playtimeBuckets.length > 0 || freeVsPaid.length > 0) && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <Panel className="p-4">
            <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
              Value by playtime
            </h2>
            <p className="mb-4 text-xs text-[var(--faint)]">
              Where paid-library value sits by hours played
            </p>
            {s.playtimeBuckets.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No priced games yet.</p>
            ) : (
              <LineChart
                data={bucketChartData}
                ariaLabel="Value by playtime"
                valueLabel="value"
                size="lg"
                formatXLabel={(l) => l}
                formatValue={(n) => money(n)}
                formatYTick={(n) => formatMoney(n, currency, { compact: true })}
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
            {freeVsPaid.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No priced games yet.</p>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-4 sm:flex-row">
                <SketchDonut
                  data={freeVsPaid.map((entry, i) => ({
                    name: entry.name,
                    value: entry.value,
                    color: i === 0 ? "#7dd3c0" : "#8a7f9a",
                  }))}
                  ariaLabel="Paid vs free library mix"
                  formatValue={(n) => `${n} games`}
                />
                <div className="space-y-3 text-sm">
                  {freeVsPaid.map((entry, i) => (
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

      {s && s.shelfware.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 font-display text-2xl font-bold tracking-tight">
            Shelfware
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Highest-value paid games with zero playtime ·{" "}
            {money(s.unplayedValue)} tied up
          </p>
          <div className="space-y-2">
            {s.shelfware.map((row) => (
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
        <RoiList
          rows={bestRoi.data?.items ?? []}
          currency={currency}
          emptyMessage={
            bestRoi.isLoading
              ? "Loading rankings…"
              : (bestRoi.data?.total ?? 0) === 0
                ? "Price data will appear after the next store sync."
                : `No ${bestTab} games with playtime to rank.`
          }
        />
        <RoiPagination
          page={bestPage}
          totalPages={bestTotalPages}
          onPageChange={setBestPage}
        />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Least value (highest cost/hour)
          </h2>
          <ValueTabs value={worstTab} onChange={setWorstTab} />
        </div>
        <RoiList
          rows={worstRoi.data?.items ?? []}
          currency={currency}
          emptyMessage={
            worstRoi.isLoading
              ? "Loading rankings…"
              : (worstRoi.data?.total ?? 0) === 0
                ? "Price data will appear after the next store sync."
                : `No ${worstTab} games with playtime to rank.`
          }
        />
        <RoiPagination
          page={worstPage}
          totalPages={worstTotalPages}
          onPageChange={setWorstPage}
        />
      </section>
    </>
  );
}
