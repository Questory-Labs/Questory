"use client";

import { StatCard } from "@/components/StatCard";
import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { CostValueShares } from "./CostValueShares";

export const CostHero = ({ summary }: { summary: CostSummary }) => {
  const currency = summary.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);
  const priced = summary.pricedGameCount ?? 0;
  const librarySize = summary.librarySize ?? 0;

  return (
    <>
      <Panel size="lg" className="p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          Estimated library value
        </p>
        <p className="mt-2 font-display text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
          {money(summary.lifetimeAtCurrent)}
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          {summary.usingStoreEstimates
            ? "Store and ITAD prices, not purchase history."
            : "Recorded prices where you entered them, otherwise current store prices."}{" "}
          Lowest recorded {money(summary.lifetimeAtLowest)} · {priced} of{" "}
          {librarySize} games priced.
        </p>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Cost / hour"
          value={money(summary.costPerHour)}
          hint={
            summary.totalHours > 0
              ? `${summary.totalHours.toLocaleString()}h played`
              : "Based on current store prices"
          }
        />
        <StatCard
          label="Idle value"
          value={money(summary.moneyWasted)}
          hint={`${summary.neverPlayedCount} unplayed · ${summary.underOneHourCount} under 1h`}
        />
        <StatCard
          label="Priced mix"
          value={`${summary.paidGameCount ?? 0} paid`}
          hint={`${summary.freeGameCount ?? 0} free`}
        />
      </div>

      <CostValueShares summary={summary} />
    </>
  );
};
