"use client";

import { StoreBadge } from "@/components/StoreBadge";
import { formatMoney } from "@/lib/money";
import type { DealAlert } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";
import { DEAL_LABELS } from "../steam.wishlist.constants";

export const DealAlerts = ({
  deals,
  currency,
}: {
  deals: DealAlert[];
  currency: string;
}) => (
  <section className="mt-8">
    <h2 className="mb-3 font-display text-xl font-bold">Deal alerts</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {deals.slice(0, 6).map((d) => (
        <Panel
          key={`${d.store}-${d.externalId || d.appId}-${d.reason}`}
          className="flex gap-3 bg-[var(--bg-1)] p-3"
        >
          {d.headerImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.headerImage}
              alt=""
              className="h-14 w-[100px] object-cover"
            />
          )}
          <div className="min-w-0">
            <div className="mb-1">
              {d.store ? <StoreBadge store={d.store} compact /> : null}
            </div>
            <div className="truncate text-sm font-medium">{d.name}</div>
            <div className="mt-1 font-mono text-[11px] text-[var(--accent)]">
              {DEAL_LABELS[d.reason]}
              {d.currentPrice != null
                ? ` · ${formatMoney(d.currentPrice, currency)}`
                : ""}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  </section>
);
