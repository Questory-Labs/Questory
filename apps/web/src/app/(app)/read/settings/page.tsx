"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, PageHeader, Panel } from "@/components/ui";
import { readFetch, readUrl } from "@/lib/read";
import type { ReactNode } from "react";

type ConnStatus = {
  connected: boolean;
  userId?: string;
  syncing?: boolean;
  lastSyncedAt?: string | null;
};

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "idle" | "warn";
  children: ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
      : tone === "warn"
        ? "bg-[var(--bg-3)] text-[var(--ink)]"
        : "bg-[var(--bg-2)] text-[var(--faint)]";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}

export default function ReadSettingsPage() {
  const qc = useQueryClient();
  const anilist = useQuery({
    queryKey: ["read-anilist-status"],
    queryFn: () => readFetch<ConnStatus>("/anilist/status"),
  });

  const sync = useMutation({
    mutationFn: () =>
      readFetch<{ ok: boolean; mangaAccepted?: number }>("/anilist/sync", {
        method: "POST",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["read-anilist-status"] });
      void qc.invalidateQueries({ queryKey: ["read-sync-status"] });
      void qc.invalidateQueries({ queryKey: ["read-overview"] });
      void qc.invalidateQueries({ queryKey: ["read-library"] });
    },
  });

  const connected = Boolean(anilist.data?.connected);
  const syncing = Boolean(anilist.data?.syncing || sync.isPending);

  return (
    <>
      <PageHeader
        title="Sources"
        description="AniList powers both anime (Watch) and manga (Read) from one connection."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Live
            </span>
            <StatusPill
              tone={syncing ? "warn" : connected ? "ok" : "idle"}
            >
              {syncing ? "Syncing" : connected ? "Connected" : "Not connected"}
            </StatusPill>
          </div>
          <h2
            className="mt-3 font-display text-xl tracking-tight text-[var(--ink)]"
            style={{ fontWeight: 700 }}
          >
            AniList
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Sync manga, manhwa, manhua, and novels into your Read library. Uses
            the same OAuth connection as Watch anime sync.
          </p>
          {anilist.data?.lastSyncedAt ? (
            <p className="mt-2 font-mono text-[10px] text-[var(--faint)]">
              Last synced{" "}
              {new Date(anilist.data.lastSyncedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {!connected ? (
              <Button
                onClick={() => {
                  window.location.href = readUrl("/anilist/authorize");
                }}
              >
                Connect AniList
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={syncing}
                onClick={() => sync.mutate()}
              >
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
