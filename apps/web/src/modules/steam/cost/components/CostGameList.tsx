"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GameCover } from "@/components/GameCover";
import { formatMoney } from "@/lib/money";
import type { CostRoiRow } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { costRowHref, costRowKey } from "../steam.cost.utils";

const GameIdentity = ({
  row,
  children,
}: {
  row: CostRoiRow;
  children: ReactNode;
}) => {
  const cover = (
    <span aria-hidden className="shrink-0">
      <GameCover
        src={row.headerImage ?? null}
        className="w-[84px]"
        fallback=""
      />
    </span>
  );
  const href = costRowHref(row);
  if (!href) {
    return (
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {cover}
        {children}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-1 items-start gap-3 hover:text-[var(--accent)]"
    >
      {cover}
      {children}
    </Link>
  );
};

export const CostGameList = ({
  rows,
  currency,
  emptyMessage,
  rankOffset = 0,
  showRoi = true,
}: {
  rows: CostRoiRow[];
  currency: string;
  emptyMessage: string;
  rankOffset?: number;
  showRoi?: boolean;
}) => {
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <Panel variant="outline">
      <ol className="divide-y divide-[var(--line)]">
        {rows.map((row, i) => {
          const primary =
            showRoi && row.costPerHour != null
              ? `${money(row.costPerHour)}/h`
              : money(row.amount);
          const meta = [
            showRoi ? `${row.hours.toLocaleString()}h played` : null,
            showRoi ? `${money(row.amount)} estimated` : null,
            !showRoi && (row.currentPrice != null || row.lowestPrice != null)
              ? `Now ${money(row.currentPrice)} · low ${money(row.lowestPrice)}`
              : null,
          ].filter(Boolean);
          const storeLine =
            showRoi && (row.currentPrice != null || row.lowestPrice != null)
              ? `Now ${money(row.currentPrice)} · low ${money(row.lowestPrice)}`
              : null;

          return (
            <li
              key={costRowKey(row)}
              className="flex items-start gap-3 px-3 py-3 hover:bg-[var(--bg-2)]"
            >
              <span className="w-6 shrink-0 pt-2 text-right font-mono text-[11px] tabular-nums text-[var(--faint)]">
                {rankOffset + i + 1}
              </span>
              <GameIdentity row={row}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.name}</span>
                  {meta.length > 0 ? (
                    <span className="mt-1 block font-mono text-[11px] text-[var(--muted)]">
                      {meta.join(" · ")}
                    </span>
                  ) : null}
                  {storeLine ? (
                    <span className="mt-0.5 block font-mono text-[11px] text-[var(--faint)]">
                      {storeLine}
                    </span>
                  ) : null}
                </span>
              </GameIdentity>
              <span className="shrink-0 pt-2 text-right font-mono text-sm tabular-nums text-[var(--ink)]">
                {primary}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
};
