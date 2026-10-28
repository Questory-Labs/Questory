"use client";

import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";
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
    <section
      aria-labelledby="cost-unplayed"
      className="panel q-in min-w-0 flex-[1_1_340px] px-3.5 pb-3 pt-5"
      style={{ ["--i" as string]: 3 }}
    >
      <h2 id="cost-unplayed" className="mx-2 text-[17px] font-normal">
        Unplayed
      </h2>
      <p className="mx-2 mt-1 text-[13px] text-[var(--muted)]">
        {money(summary.unplayedValue)} of priced value has no playtime.
      </p>
      {buckets.length > 0 ? (
        <div className="mx-2 mt-4">
          <CostShareList title="Value by hours" rows={buckets} currency={currency} />
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-3">
          <CostGameList
            rows={rows}
            currency={currency}
            emptyMessage="No unplayed priced games."
            showRoi={false}
          />
        </div>
      ) : null}
    </section>
  );
};
