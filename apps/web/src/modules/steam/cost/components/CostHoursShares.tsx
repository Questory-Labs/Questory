"use client";

import type { CostSummary } from "@questorylabs/shared";
import { CostShareList } from "./CostShareList";

export const CostHoursShares = ({ summary }: { summary: CostSummary }) => {
  const rows = (summary.playtimeBuckets ?? []).map((b) => ({
    name: b.name,
    amount: b.amount,
  }));
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="cost-hours"
      className="panel q-in min-w-0 flex-[1_1_340px] px-[22px] py-5"
      style={{ ["--i" as string]: 3 }}
    >
      <h2 id="cost-hours" className="flex min-h-9 items-center text-[17px] font-normal">
        Value by hours
      </h2>
      <CostShareList rows={rows} currency={summary.currency || "USD"} />
    </section>
  );
};
