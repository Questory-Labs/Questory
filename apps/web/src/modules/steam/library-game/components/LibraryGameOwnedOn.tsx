"use client";

import type { LibraryEntry } from "@questorylabs/shared";
import { StoreBadge } from "@/components/StoreBadge";
import { formatMoney } from "@/lib/money";
import { playtimeHours } from "../steam.library-game.utils";

export const LibraryGameOwnedOn = ({
  entry,
  currency,
}: {
  entry: LibraryEntry;
  currency: string;
}) => {
  const ownerships = entry.ownerships || [];
  if (ownerships.length <= 1) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Owned on</h2>
      <ul className="divide-y divide-[var(--line)] panel-outline">
        {ownerships.map((o) => (
          <li
            key={o.store}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <StoreBadge store={o.store} />
            <span className="font-mono text-xs text-[var(--muted)]">
              {playtimeHours(o.playtimeForever)}h
              {o.listing?.currentPrice != null
                ? ` · ${formatMoney(o.listing.currentPrice, currency)}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
