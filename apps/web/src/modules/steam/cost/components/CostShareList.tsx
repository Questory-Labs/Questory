"use client";

import { formatMoney } from "@/lib/money";
import { costBarPct } from "../steam.cost.utils";

export type CostShareRow = { name: string; amount: number };

export const CostShareList = ({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: CostShareRow[];
  currency: string;
}) => {
  const money = (n: number) => formatMoney(n, currency, { compact: true });
  const max = Math.max(0, ...rows.map((row) => row.amount));

  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => {
          const pct = costBarPct(row.amount, max);
          return (
            <li key={row.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate" title={row.name}>
                  {row.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted)]">
                  {money(row.amount)}
                </span>
              </div>
              <div
                className="mt-1.5 h-1 overflow-hidden bg-[var(--line)]"
                aria-hidden
              >
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
