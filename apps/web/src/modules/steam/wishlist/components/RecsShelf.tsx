"use client";

import { GameTile } from "@/components/GameTile";
import { StoreBadge } from "@/components/StoreBadge";
import { WISHLIST_REC_LIMIT } from "../steam.wishlist.constants";
import type { Recommendation } from "../steam.wishlist.types";

export const RecsShelf = ({ recs }: { recs: Recommendation[] }) => (
  <section aria-labelledby="recs" className="q-in" style={{ ["--i" as string]: 3 }}>
    <h2 id="recs" className="mx-1 text-[17px] font-normal">
      Recommended buys{" "}
      <span className="text-[13px] text-[var(--muted)]">
        · score ≥ 50 from discount depth, wishlist age and genre fit
      </span>
    </h2>
    <div className="mt-3 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {recs.slice(0, WISHLIST_REC_LIMIT).map((item, i) => (
        <GameTile
          key={`${item.store}-${item.externalId}`}
          name={item.name}
          headerImage={item.headerImage}
          meta={[
            item.shouldBuyScore != null ? `Score ${item.shouldBuyScore}` : null,
            ...(item.reasons || []).slice(0, 1),
            item.discountPercent ? `−${item.discountPercent}%` : null,
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
