"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { GameTile } from "@/components/GameTile";
import { StoreBadge } from "@/components/StoreBadge";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type { DealAlert, Store, WishlistItem } from "@questorylabs/shared";
import { useMemo, useState } from "react";

type MeResponse = {
  user: {
    countryCode?: string | null;
    currency?: string;
  } | null;
};

type Recommendation = WishlistItem & { reasons?: string[] };

const DEAL_LABELS: Record<DealAlert["reason"], string> = {
  target: "Target hit",
  historical_low: "Near low",
  strong_score: "Strong score",
};

const STORE_CHIPS: { id: Store | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "steam", label: "Steam" },
  { id: "epic", label: "Epic" },
  { id: "gog", label: "GOG" },
];

export default function WishlistPage() {
  const qc = useQueryClient();
  const [storeFilter, setStoreFilter] = useState<Store | "all">("all");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
  });
  const listPath = useMemo(() => {
    if (storeFilter === "all") return "/wishlist";
    return `/wishlist?store=${storeFilter}`;
  }, [storeFilter]);
  const list = useQuery({
    queryKey: ["wishlist", storeFilter],
    queryFn: () => api<WishlistItem[]>(listPath),
  });
  const recommendations = useQuery({
    queryKey: ["wishlist-recommendations"],
    queryFn: () => api<Recommendation[]>("/wishlist/recommendations"),
  });
  const deals = useQuery({
    queryKey: ["wishlist-deals"],
    queryFn: () => api<DealAlert[]>("/wishlist/deals"),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const currency = me.data?.user?.currency || "USD";

  const update = useMutation({
    mutationFn: ({
      store,
      externalId,
      targetPrice,
    }: {
      store: Store;
      externalId: string;
      targetPrice: number | null;
    }) =>
      api(`/wishlist/${store}/${externalId}`, {
        method: "PATCH",
        body: JSON.stringify({ targetPrice }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["wishlist-recommendations"] });
      qc.invalidateQueries({ queryKey: ["wishlist-deals"] });
    },
  });

  const filteredRecs = (recommendations.data || []).filter(
    (i) => storeFilter === "all" || i.store === storeFilter,
  );
  const filteredDeals = (deals.data || []).filter(
    (d) => storeFilter === "all" || d.store === storeFilter,
  );

  return (
    <AppShell>
      <PageHeader
        title="Wishlist"
        description="Should-buy scores, price targets, and deal signals across Steam, Epic, and GOG"
      />

      <div className="flex flex-wrap gap-2">
        {STORE_CHIPS.map((chip) => {
          const active = storeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStoreFilter(chip.id)}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {filteredDeals.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold">Deal alerts</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.slice(0, 6).map((d) => (
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
      )}

      {filteredRecs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold">
            Recommended buys
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Score ≥ 50 from discount depth, wishlist age, and genre affinity
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredRecs.slice(0, 8).map((item, i) => (
              <GameTile
                key={`${item.store}-${item.externalId}`}
                name={item.name}
                headerImage={item.headerImage}
                meta={[
                  item.shouldBuyScore != null
                    ? `Score ${item.shouldBuyScore}`
                    : null,
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
      )}

      <Panel className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--bg-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Current</th>
              <th className="px-4 py-3 font-medium">Lowest</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {(list.data || []).map((item) => {
              const editKey = `${item.store}:${item.externalId}`;
              return (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.headerImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.headerImage}
                          alt=""
                          className="h-10 w-[84px] rounded object-cover"
                        />
                      )}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StoreBadge store={item.store} compact />
                  </td>
                  <td className="px-4 py-3">
                    {item.currentPrice != null
                      ? formatMoney(item.currentPrice, currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.lowestPrice != null
                      ? formatMoney(item.lowestPrice, currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {editing === editKey ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(ev) => {
                          ev.preventDefault();
                          update.mutate({
                            store: item.store,
                            externalId: item.externalId,
                            targetPrice: target ? Number(target) : null,
                          });
                          setEditing(null);
                        }}
                      >
                        <input
                          value={target}
                          onChange={(ev) => setTarget(ev.target.value)}
                          className="w-20 rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1"
                        />
                        <Button type="submit" variant="ghost">
                          Save
                        </Button>
                      </form>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(editKey);
                          setTarget(
                            item.targetPrice != null
                              ? String(item.targetPrice)
                              : "",
                          );
                        }}
                      >
                        {item.targetPrice != null
                          ? formatMoney(item.targetPrice, currency)
                          : "Set"}
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--warm)]">
                    {item.shouldBuyScore ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
