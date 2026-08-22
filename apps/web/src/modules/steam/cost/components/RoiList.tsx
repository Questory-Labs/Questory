"use client";

import type { CostRoiRow } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { formatMoney } from "@/lib/money";

export const RoiList = ({
  rows,
  currency,
  emptyMessage,
}: {
  rows: CostRoiRow[];
  currency: string;
  emptyMessage: string;
}) => {
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
};
