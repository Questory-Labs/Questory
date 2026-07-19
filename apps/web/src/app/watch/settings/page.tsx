"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WatchGate } from "@/components/WatchGate";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { Button, PageHeader } from "@/components/ui";
import { WATCH_URL, watchFetch, watchUrl } from "@/lib/watch";
import { useState } from "react";

type ConnStatus = {
  connected: boolean;
  userId?: string;
  lastSyncedAt?: string | null;
};

function SourceSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--line)] pt-8">
      <h2
        className="font-display text-xl text-[var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function WatchSettingsPage() {
  const qc = useQueryClient();
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const trakt = useQuery({
    queryKey: ["trakt-status"],
    queryFn: () => watchFetch<ConnStatus>("/trakt/status"),
  });
  const anilist = useQuery({
    queryKey: ["anilist-status"],
    queryFn: () => watchFetch<ConnStatus>("/anilist/status"),
  });

  const syncTrakt = useMutation({
    mutationFn: () => watchFetch("/trakt/sync", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["trakt-status"] });
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
    },
  });

  const syncAni = useMutation({
    mutationFn: () => watchFetch("/anilist/sync", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["anilist-status"] });
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
    },
  });

  async function onLetterboxd(file: File | null) {
    if (!file) return;
    setFileName(file.name);
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
      <PageHeader
        title="Sources"
        description="Connect Trakt, import a Letterboxd diary, or point Plex / Jellyfin webhooks here."
      />

      <div className="space-y-2">
        <SourceSection title="Trakt">
          <p className="text-sm text-[var(--muted)]">
            {trakt.data?.connected
              ? `Connected · last sync ${trakt.data.lastSyncedAt || "never"}`
              : "Not connected"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={watchUrl("/trakt/authorize")} className="btn btn-secondary">
              Connect Trakt
            </a>
            <Button
              variant="secondary"
              disabled={syncTrakt.isPending || !trakt.data?.connected}
              onClick={() => syncTrakt.mutate()}
            >
              {syncTrakt.isPending ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </SourceSection>

        <SourceSection title="AniList">
          <p className="text-sm text-[var(--muted)]">
            {anilist.data?.connected
              ? `Connected · last sync ${anilist.data.lastSyncedAt || "never"}`
              : "Not connected"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={watchUrl("/anilist/authorize")}
              className="btn btn-secondary"
            >
              Connect AniList
            </a>
            <Button
              variant="secondary"
              disabled={syncAni.isPending || !anilist.data?.connected}
              onClick={() => syncAni.mutate()}
            >
              {syncAni.isPending ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </SourceSection>

        <SourceSection title="Letterboxd">
          <p className="text-sm text-[var(--muted)]">
            Upload the diary CSV from Letterboxd&apos;s official data export.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="btn btn-secondary inline-flex cursor-pointer">
              Choose CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) =>
                  void onLetterboxd(e.target.files?.[0] ?? null)
                }
              />
            </label>
            <span className="text-sm text-[var(--faint)]">
              {fileName || "No file selected"}
            </span>
          </div>
          {importMsg && (
            <p className="mt-2 text-sm text-[var(--muted)]">{importMsg}</p>
          )}
        </SourceSection>

        <SourceSection title="Plex / Jellyfin">
          <p className="text-sm text-[var(--muted)]">
            Point player webhooks at these URLs, then generate a personal key.
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-xs text-[var(--faint)]">
            <li>POST {WATCH_URL}/webhooks/plex</li>
            <li>POST {WATCH_URL}/webhooks/jellyfin</li>
          </ul>
          <ApiKeyPanel
            embedded
            type="watch_webhook"
            title="Webhook key"
            description="Shown once when generated. Rotate anytime."
          />
        </SourceSection>
      </div>
    </WatchGate>
  );
}
