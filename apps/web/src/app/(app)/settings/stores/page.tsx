"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { Suspense } from "react";
import { StoreBadge } from "@/components/StoreBadge";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { api } from "@/lib/api";
import type { Store, StoreAccountStatus } from "@questorylabs/shared";

const STORE_COPY: Record<Store, { title: string; blurb: string }> = {
  steam: {
    title: "Steam",
    blurb:
      "Linked from Connections. Library, wishlist, friends, and prices sync from Steam.",
  },
  epic: {
    title: "Epic Games",
    blurb:
      "Store tags and filters are ready. Live library sync is coming later — Epic’s APIs are limited.",
  },
  gog: {
    title: "GOG",
    blurb:
      "Store tags and filters are ready. Live library sync is coming later — GOG auth and data access are limited.",
  },
};

const FALLBACK: StoreAccountStatus[] = [
  {
    store: "steam",
    connected: true,
    syncEnabled: true,
    status: "connected",
  },
  {
    store: "epic",
    connected: false,
    syncEnabled: false,
    status: "coming_later",
  },
  {
    store: "gog",
    connected: false,
    syncEnabled: false,
    status: "coming_later",
  },
];

function StoresContent() {
  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => api<StoreAccountStatus[]>("/stores"),
  });

  const rows = stores.data?.length ? stores.data : FALLBACK;

  return (
    <>
      <PageHeader
        title="Stores"
        description="Steam powers sync today. Epic and GOG appear in library filters and badges; account import will land when the data sources are solid enough."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {rows.map((status) => {
          const copy = STORE_COPY[status.store];
          const comingLater =
            status.store !== "steam" &&
            (status.status === "coming_later" || status.syncEnabled === false);
          return (
            <Panel key={status.store} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <StoreBadge store={status.store} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  {comingLater ? "Coming later" : "Connected"}
                </span>
              </div>
              <h2 className="mt-3 font-display text-lg font-bold tracking-tight">
                {copy.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{copy.blurb}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {status.store === "steam" ? (
                  <span className="border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]">
                    Sync runs automatically
                  </span>
                ) : (
                  <span className="border border-dashed border-[var(--line)] px-3 py-1.5 text-sm text-[var(--faint)]">
                    Manual import planned
                  </span>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

export default function StoresSettingsPage() {
  return (
    <>
      <Suspense fallback={<StateMessage variant="loading" className="mt-0" />}>
        <StoresContent />
      </Suspense>
    </>
  );
}
