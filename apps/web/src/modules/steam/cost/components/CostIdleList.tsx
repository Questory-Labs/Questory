"use client";

import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { CostGameList } from "./CostGameList";
import { CostShareList } from "./CostShareList";

export const CostIdleList = ({ summary }: { summary: CostSummary }) => {
  const rows = summary.shelfware ?? [];
  const buckets = (summary.playtimeBuckets ?? []).map((b) => ({
    name: b.name,
    amount: b.amount,
  }));
  if (rows.length === 0 && buckets.length === 0) return null;

  const currency = summary.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold tracking-tight">Unplayed</h2>
      <p className="mt-1 mb-4 text-sm text-[var(--muted)]">
        {money(summary.unplayedValue)} of priced value has no playtime.
      </p>
      {buckets.length > 0 ? (
        <Panel variant="outline" className="mb-4 p-4">
          <CostShareList
            title="Value by hours"
            rows={buckets}
            currency={currency}
          />
        </Panel>
      ) : null}
      {rows.length > 0 ? (
        <CostGameList
          rows={rows}
          currency={currency}
          emptyMessage="No unplayed priced games."
          showRoi={false}
        />
      ) : null}
    </section>
  );
};
