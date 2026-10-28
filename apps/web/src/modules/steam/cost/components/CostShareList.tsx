"use client";

import { formatMoney } from "@/lib/money";
import { costBarPct } from "../steam.cost.utils";

export type CostShareRow = { name: string; amount: number };

export const CostShareList = ({
  title,
  rows,
  currency,
}: {
  title?: string;
  rows: CostShareRow[];
  currency: string;
}) => {
  const money = (n: number) => formatMoney(n, currency, { compact: true });
  const max = Math.max(0, ...rows.map((row) => row.amount));

  if (rows.length === 0) return null;

  return (
    <div>
      {title ? <h3 className="label-mono text-[var(--faint)]">{title}</h3> : null}
      <ul className="mt-3.5 flex flex-col gap-3.5">
        {rows.map((row) => {
          const pct = costBarPct(row.amount, max);
          return (
            <li
              key={row.name}
              className="grid grid-cols-[minmax(0,96px)_1fr_84px] items-center gap-3.5 text-sm"
            >
              <span className="truncate text-[var(--muted)]" title={row.name}>
                {row.name}
              </span>
              <span aria-hidden="true" className="h-[3px] rounded-sm bg-white/[0.06]">
                <span
                  className="q-bar block h-[3px] rounded-sm bg-[var(--ink)] shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-right font-light tabular-nums">{money(row.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
