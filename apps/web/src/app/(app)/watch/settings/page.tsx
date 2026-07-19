"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { PageHeader, Panel } from "@/components/ui";
import { WATCH_URL, watchFetch, watchUrl } from "@/lib/watch";
import { useState, type ReactNode } from "react";

type ConnStatus = {
  connected: boolean;
  userId?: string;
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

function SourceCard({
  label,
  title,
  blurb,
  status,
  children,
}: {
  label: string;
  title: string;
  blurb: string;
  status: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Panel className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          {label}
        </span>
        {status}
      </div>
      <h2
        className="mt-3 font-display text-xl tracking-tight text-[var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{blurb}</p>
      {children ? <div className="mt-auto pt-5">{children}</div> : null}
    </Panel>
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

  const traktConnected = Boolean(trakt.data?.connected);
  const anilistConnected = Boolean(anilist.data?.connected);
  const importOk = importMsg?.startsWith("Imported") ?? false;
  const importFailed =
    importMsg != null &&
    !importMsg.startsWith("Imported") &&
    !importMsg.startsWith("Import");

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="Sources"
        description="Connect Trakt, import a Letterboxd diary, or point Plex / Jellyfin webhooks here."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SourceCard
          label="OAuth"
          title="Trakt"
          blurb={
            traktConnected
              ? `Connected · last sync ${trakt.data?.lastSyncedAt || "never"}`
              : "Connect Trakt to sync your watched history and keep Watch up to date."
          }
          status={
            traktConnected ? (
              <StatusPill tone="ok">Connected</StatusPill>
            ) : (
              <StatusPill tone="idle">Connect</StatusPill>
            )
          }
        >
          <div className="flex flex-wrap gap-3">
            <a href={watchUrl("/trakt/authorize")} className="btn btn-secondary">
              Connect Trakt
            </a>
          </div>
        </SourceCard>

        <SourceCard
          label="OAuth"
          title="AniList"
          blurb={
            anilistConnected
              ? `Connected · last sync ${anilist.data?.lastSyncedAt || "never"}`
              : "Connect AniList to sync anime progress into your Watch library."
          }
          status={
            anilistConnected ? (
              <StatusPill tone="ok">Connected</StatusPill>
            ) : (
              <StatusPill tone="idle">Connect</StatusPill>
            )
          }
        >
          <div className="flex flex-wrap gap-3">
            <a
              href={watchUrl("/anilist/authorize")}
              className="btn btn-secondary"
            >
              Connect AniList
            </a>
          </div>
        </SourceCard>

        <SourceCard
          label="Import"
          title="Letterboxd"
          blurb="Upload the diary CSV from Letterboxd’s official data export."
          status={
            importOk ? (
              <StatusPill tone="ok">Done</StatusPill>
            ) : importFailed ? (
              <StatusPill tone="warn">Error</StatusPill>
            ) : importMsg?.startsWith("Import") ? (
              <StatusPill tone="warn">Running</StatusPill>
            ) : (
              <StatusPill tone="idle">Upload</StatusPill>
            )
          }
        >
          <div className="flex flex-wrap items-center gap-3">
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
            <span className="truncate text-sm text-[var(--faint)]">
              {fileName || "No file selected"}
            </span>
          </div>
          {importMsg && (
            <p
              className={`mt-3 text-sm ${
                importOk
                  ? "text-[var(--accent)]"
                  : importMsg.startsWith("Import")
                    ? "text-[var(--muted)]"
                    : "text-[var(--danger)]"
              }`}
            >
              {importMsg}
            </p>
          )}
        </SourceCard>

        <SourceCard
          label="Live ingest"
          title="Plex / Jellyfin"
          blurb="Point player webhooks at these URLs, then generate a personal key."
          status={<StatusPill tone="idle">API</StatusPill>}
        >
          <ul className="mb-4 space-y-1.5 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
            <li className="break-all">
              <span className="text-[var(--faint)]">POST</span> {WATCH_URL}
              /webhooks/plex
            </li>
            <li className="break-all">
              <span className="text-[var(--faint)]">POST</span> {WATCH_URL}
              /webhooks/jellyfin
            </li>
          </ul>
          <ApiKeyPanel
            embedded
            type="watch_webhook"
            title="Webhook key"
            description="Shown once when generated. Rotate anytime."
          />
        </SourceCard>
      </div>
    </>
  );
}
