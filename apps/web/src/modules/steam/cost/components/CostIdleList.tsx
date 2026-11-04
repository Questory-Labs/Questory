"use client";

import { formatMoney } from "@/lib/money";
import type { CostSummary } from "@questorylabs/shared";
import { CostGameList } from "./CostGameList";

export const CostIdleList = ({ summary }: { summary: CostSummary }) => {
  const rows = summary.shelfware ?? [];
  if (rows.length === 0) return null;

  const currency = summary.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  return (
    <section
      aria-labelledby="cost-unplayed"
      className="panel q-in min-w-0 flex-[1_1_100%] px-3.5 pb-3 pt-5"
      style={{ ["--i" as string]: 4 }}
    >
      <h2 id="cost-unplayed" className="mx-2 text-[17px] font-normal">
        Unplayed
      </h2>
      <p className="mx-2 mt-1 text-[13px] text-[var(--muted)]">
        {money(summary.unplayedValue)} of priced value has no playtime.
      </p>
      <div className="mt-3">
        <CostGameList
          rows={rows}
          currency={currency}
          emptyMessage="No unplayed priced games."
          showRoi={false}
        />
      </div>
    </section>
  );
};
