"use client";

import { LineChart } from "@/components/charts/LineChart";
import { SketchDonut } from "@/components/charts/SketchDonut";
import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { SpendChart } from "./SpendChart";

export const CostMixCharts = ({ summary }: { summary: CostSummary }) => {
  const currency = summary.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  const genreChart = summary.byGenre
    .slice(0, 10)
    .map((row) => ({ name: row.genre, amount: row.amount }));
  const publisherChart = summary.byPublisher
    .slice(0, 10)
    .map((row) => ({ name: row.publisher, amount: row.amount }));

  const bucketChartData = summary.playtimeBuckets.map((b) => ({
    label: b.name,
    value: b.amount,
  }));

  const freeVsPaid = [
    {
      name: "Paid",
      value: summary.libraryMix.paid.count,
      amount: summary.libraryMix.paid.amount,
    },
    { name: "Free", value: summary.libraryMix.free.count, amount: 0 },
  ].filter((d) => d.value > 0);

  return (
    <>
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

      {(summary.playtimeBuckets.length > 0 || freeVsPaid.length > 0) && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <Panel className="p-4">
            <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
              Value by playtime
            </h2>
            <p className="mb-4 text-xs text-[var(--faint)]">
              Where paid-library value sits by hours played
            </p>
            {summary.playtimeBuckets.length === 0 ? (
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

      {summary.shelfware.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 font-display text-2xl font-bold tracking-tight">
            Shelfware
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Highest-value paid games with zero playtime ·{" "}
            {money(summary.unplayedValue)} tied up
          </p>
          <div className="space-y-2">
            {summary.shelfware.map((row) => (
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
    </>
  );
};
