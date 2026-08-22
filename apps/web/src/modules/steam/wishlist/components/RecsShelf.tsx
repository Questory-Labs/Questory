"use client";

import { GameTile } from "@/components/GameTile";
import { StoreBadge } from "@/components/StoreBadge";
import type { Recommendation } from "../steam.wishlist.types";

export const RecsShelf = ({ recs }: { recs: Recommendation[] }) => (
  <section className="mt-10">
    <h2 className="mb-3 font-display text-xl font-bold">Recommended buys</h2>
    <p className="mb-4 text-sm text-[var(--muted)]">
      Score ≥ 50 from discount depth, wishlist age, and genre affinity
    </p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {recs.slice(0, 8).map((item, i) => (
        <GameTile
          key={`${item.store}-${item.externalId}`}
          name={item.name}
          headerImage={item.headerImage}
          meta={[
            item.shouldBuyScore != null ? `Score ${item.shouldBuyScore}` : null,
            ...(item.reasons || []).slice(0, 1),
          ]
            .filter(Boolean)
            .join(" · ")}
          index={i}
          corner={<StoreBadge store={item.store} compact />}
        />
      ))}
    </div>
  </section>
);
