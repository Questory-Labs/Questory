"use client";

import { StatCard } from "@/components/StatCard";
import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";

export const CostSummaryStats = ({ summary }: { summary: CostSummary }) => {
  const money = (n: number | null | undefined) =>
    formatMoney(n, summary.currency || "USD");

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Library value"
        value={money(summary.lifetimeAtCurrent)}
        hint={`Lowest recorded: ${money(summary.lifetimeAtLowest)} · ${summary.pricedGameCount}/${summary.librarySize} priced`}
      />
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
        label="Money wasted"
        value={money(summary.moneyWasted)}
        hint={`${summary.neverPlayedCount} unplayed · ${summary.underOneHourCount} under 1h`}
      />
      <StatCard
        label="Library mix"
        value={`${summary.paidGameCount} / ${summary.freeGameCount}`}
        hint="Paid · free (priced games)"
      />
    </div>
  );
};
