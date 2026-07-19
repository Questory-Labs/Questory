"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WatchGate } from "@/components/WatchGate";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { WATCH_URL, watchFetch, watchUrl } from "@/lib/watch";
import { useState } from "react";

type ConnStatus = {
  connected: boolean;
  userId?: string;
  lastSyncedAt?: string | null;
};

export default function WatchSettingsPage() {
  const qc = useQueryClient();
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const trakt = useQuery({
    queryKey: ["trakt-status"],
    queryFn: () => watchFetch<ConnStatus>("/trakt/status"),
  });
  const anilist = useQuery({
    queryKey: ["anilist-status"],
    queryFn: () => watchFetch<ConnStatus>("/anilist/status"),
  });

  const syncTrakt = useMutation({
    mutationFn: () =>
      watchFetch("/trakt/sync", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["trakt-status"] });
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
    },
  });

  const syncAni = useMutation({
    mutationFn: () =>
      watchFetch("/anilist/sync", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["anilist-status"] });
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
    },
  });

  async function onLetterboxd(file: File | null) {
    if (!file) return;
    setImportMsg("Importing…");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch(watchUrl("/imports/letterboxd"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await res.json()) as {
        accepted?: number;
        skipped?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(JSON.stringify(json));
      setImportMsg(
        `Imported ${json.accepted ?? 0} rows (${json.skipped ?? 0} skipped).`,
      );
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
      void qc.invalidateQueries({ queryKey: ["watch-recent"] });
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <WatchGate>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[var(--ink)]">Sources</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Connect Trakt for day/hour history, import Letterboxd diary CSV
          (official export only — no scraping), and optionally AniList for
          anime lists.
        </p>

        <section className="mt-10 space-y-6">
          <div className="border border-[var(--line)] p-5">
            <h2 className="font-display text-lg text-[var(--ink)]">Trakt</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {trakt.data?.connected
                ? `Connected. Last sync: ${trakt.data.lastSyncedAt || "never"}`
                : "Not connected"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={watchUrl("/trakt/authorize")}
                className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
              >
                Connect Trakt
              </a>
              <button
                type="button"
                disabled={syncTrakt.isPending || !trakt.data?.connected}
                onClick={() => syncTrakt.mutate()}
                className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-40"
              >
                {syncTrakt.isPending ? "Syncing…" : "Sync now"}
              </button>
            </div>
          </div>

          <div className="border border-[var(--line)] p-5">
            <h2 className="font-display text-lg text-[var(--ink)]">AniList</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {anilist.data?.connected
                ? `Connected. Last sync: ${anilist.data.lastSyncedAt || "never"}`
                : "Not connected"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={watchUrl("/anilist/authorize")}
                className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
              >
                Connect AniList
              </a>
              <button
                type="button"
                disabled={syncAni.isPending || !anilist.data?.connected}
                onClick={() => syncAni.mutate()}
                className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-40"
              >
                {syncAni.isPending ? "Syncing…" : "Sync now"}
              </button>
            </div>
          </div>

          <div className="border border-[var(--line)] p-5">
            <h2 className="font-display text-lg text-[var(--ink)]">
              Letterboxd CSV
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Upload the diary CSV from Letterboxd&apos;s official data export.
              Automated scraping is not supported.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-4 block text-sm"
              onChange={(e) => void onLetterboxd(e.target.files?.[0] ?? null)}
            />
            {importMsg && (
              <p className="mt-2 text-sm text-[var(--muted)]">{importMsg}</p>
            )}
          </div>

          <div className="border border-[var(--line)] p-5">
            <h2 className="font-display text-lg text-[var(--ink)]">
              Plex / Jellyfin
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Point player webhooks at the URLs below. Mint a personal webhook
              key (shown once) and send it as{" "}
              <code>x-watch-webhook-secret</code> so scrobbles attach to your
              account.
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-[var(--ink)]">
              <li>POST {WATCH_URL}/webhooks/plex</li>
              <li>POST {WATCH_URL}/webhooks/jellyfin</li>
            </ul>
            <div className="mt-4 [&_.panel]:mt-0 [&_.panel]:max-w-none [&_.panel]:border-0 [&_.panel]:p-0">
              <ApiKeyPanel
                type="watch_webhook"
                title="Webhook API key"
                description="Rotate anytime from here or Settings → Profile."
              />
            </div>
          </div>
        </section>
      </div>
    </WatchGate>
  );
}
