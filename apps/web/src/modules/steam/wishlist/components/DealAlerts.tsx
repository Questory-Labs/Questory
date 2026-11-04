"use client";

import { formatMoney } from "@/lib/money";
import type { DealAlert } from "@questorylabs/shared";
import { CoverArt } from "../../library/components/CoverArt";
import {
  DEAL_LABELS,
  WISHLIST_DEAL_ALERT_LIMIT,
  WISHLIST_STORE_LABELS,
} from "../steam.wishlist.constants";

export const DealAlerts = ({
  deals,
  currency,
}: {
  deals: DealAlert[];
  currency: string;
}) => (
  <section aria-labelledby="deal-alerts" className="q-in" style={{ ["--i" as string]: 1 }}>
    <h2 id="deal-alerts" className="mx-1 flex items-center gap-2 text-[17px] font-normal">
      <span
        aria-hidden="true"
        className="q-live h-1.5 w-1.5 rounded-full bg-[var(--warn)] shadow-[0_0_10px_var(--warn)]"
      />
      Deal alerts
      <span className="text-[13px] text-[var(--muted)]">· targets, lows and strong scores</span>
    </h2>
    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
      {deals.slice(0, WISHLIST_DEAL_ALERT_LIMIT).map((d, i) => {
        const cut = d.discountPercent != null && d.discountPercent > 0 ? `−${d.discountPercent}%` : null;
        const meta = [
          d.store ? WISHLIST_STORE_LABELS[d.store] : null,
          DEAL_LABELS[d.reason],
          d.targetPrice != null ? `target ${formatMoney(d.targetPrice, currency)}` : null,
        ].filter(Boolean);
        return (
          <div
            key={`${d.store}-${d.externalId || d.appId}-${d.reason}`}
            className="panel q-lift q-in flex flex-col overflow-hidden border-[rgba(245,165,36,0.18)] bg-[linear-gradient(170deg,rgba(245,165,36,0.08),rgba(255,255,255,0.014)_60%)]"
            style={{ ["--i" as string]: i }}
          >
            <div className="relative h-[92px] overflow-hidden border-b border-white/[0.06]">
              <CoverArt src={d.headerImage} seed={d.name} className="opacity-80" />
              {cut ? (
                <span className="absolute right-3 top-3 rounded-full bg-[var(--warn)] px-2.5 py-0.5 text-xs font-medium text-[#1a1205]">
                  {cut}
                </span>
              ) : null}
            </div>
            <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-3.5">
              <span className="min-w-0">
                <span className="block truncate font-normal">{d.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-[var(--faint)]">
                  {meta.join(" · ")}
                </span>
              </span>
              <span className="flex-none text-[30px] font-extralight leading-none tracking-[-0.03em]">
                {formatMoney(d.currentPrice, currency)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
