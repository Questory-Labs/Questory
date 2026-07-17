"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { StoreBadge } from "@/components/StoreBadge";
import { api } from "@/lib/api";
import type { Store, StoreAccountStatus } from "@questorylabs/shared";

const STORE_COPY: Record<Store, { title: string; blurb: string }> = {
  steam: {
    title: "Steam",
    blurb:
      "Primary login. Your library, wishlist, friends, and prices sync from Steam.",
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
  const qc = useQueryClient();

  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => api<StoreAccountStatus[]>("/stores"),
  });

  const resync = useMutation({
    mutationFn: () => api(`/stores/steam/sync`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["sync-jobs"] });
    },
  });

  const rows = stores.data?.length ? stores.data : FALLBACK;

  return (
    <>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        Stores
      </h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Steam powers sync today. Epic and GOG appear in library filters and badges;
        account import will land when the data sources are solid enough.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {rows.map((status) => {
          const copy = STORE_COPY[status.store];
          const comingLater =
            status.store !== "steam" &&
            (status.status === "coming_later" || status.syncEnabled === false);
          return (
            <div
              key={status.store}
              className="border border-[var(--line)] bg-[var(--bg-1)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <StoreBadge store={status.store} />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  {comingLater ? "Coming later" : "Connected"}
                </span>
              </div>
              <h2
                className="mt-3 text-lg"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {copy.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{copy.blurb}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {status.store === "steam" ? (
                  <button
                    type="button"
                    onClick={() => resync.mutate()}
                    className="border border-[var(--line)] px-3 py-1.5 text-sm hover:border-[var(--line-strong)]"
                  >
                    Re-sync Steam
                  </button>
                ) : (
                  <span className="border border-dashed border-[var(--line)] px-3 py-1.5 text-sm text-[var(--faint)]">
                    Manual import planned
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function StoresSettingsPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
        <StoresContent />
      </Suspense>
    </AppShell>
  );
}
