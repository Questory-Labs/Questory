"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { getWatchUrl, watchFetch, watchUrl } from "@/lib/watch";
import { formatDateTime } from "@/lib/dates";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

type ConnStatus = {
  connected: boolean;
  userId?: string;
  lastSyncedAt?: string | null;
};

type LetterboxdJob = {
  id: string;
  status: string;
  total: number;
  accepted: number;
  skipped: number;
  processed: number;
  percent: number | null;
  fileName?: string | null;
  lastError?: string | null;
};

type ApiKeyMeta = {
  id: string;
  type: string;
  tokenPrefix: string;
  label?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

type IdentityResponse = {
  steamId: string | null;
  listenbrainzUsername: string | null;
  keys: ApiKeyMeta[];
};

type LiveSourceId = "trakt" | "anilist" | "webhook";

const LETTERBOXD_KINDS = [
  { id: "diary", label: "diary.csv", hint: "Logged watches" },
  { id: "ratings", label: "ratings.csv", hint: "Star ratings" },
  { id: "watched", label: "watched.csv", hint: "Marked watched" },
  { id: "watchlist", label: "watchlist.csv", hint: "Want to watch" },
] as const;

type LetterboxdKind = (typeof LETTERBOXD_KINDS)[number]["id"];

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
    <Panel wrapperClassName="h-full" className="flex h-full flex-col p-5">
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

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
          {eyebrow}
        </div>
        <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function kindFromFileName(name: string): LetterboxdKind | null {
  const base = name.replace(/\\/g, "/").split("/").pop()?.toLowerCase() || "";
  const hit = LETTERBOXD_KINDS.find((k) => k.label === base);
  return hit?.id ?? null;
}

function LetterboxdProgress({ job }: { job: LetterboxdJob }) {
  const running = job.status === "running";
  const hasTotal = job.total > 0;
  const pct = job.percent ?? 0;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-[var(--faint)]">
        <span>
          {running
            ? hasTotal
              ? `Importing ${job.processed.toLocaleString()} / ${job.total.toLocaleString()}`
              : `Importing… ${job.processed.toLocaleString()} rows`
            : job.status === "completed"
              ? `Done · ${job.accepted.toLocaleString()} imported`
              : "Stopped"}
        </span>
        <span>{hasTotal && job.percent != null ? `${pct}%` : ""}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-3)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasTotal ? pct : undefined}
        aria-label="Letterboxd import progress"
      >
        <div
          className={`h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out ${
            running && !hasTotal ? "w-1/3 animate-pulse" : ""
          }`}
          style={
            running && !hasTotal ? undefined : { width: `${Math.min(100, pct)}%` }
          }
        />
      </div>
      {running ? (
        <p className="font-mono text-[11px] text-[var(--muted)]">
          {job.accepted.toLocaleString()} accepted ·{" "}
          {job.skipped.toLocaleString()} skipped
        </p>
      ) : null}
    </div>
  );
}

function formatLastSync(value?: string | null) {
  if (!value) return "never";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : formatDateTime(value);
}

export default function WatchSettingsPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LetterboxdJob | null>(null);
  const [include, setInclude] = useState<Record<LetterboxdKind, boolean>>({
    diary: true,
    ratings: true,
    watched: true,
    watchlist: true,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<LiveSourceId, boolean>>>(
    {},
  );

  const trakt = useQuery({
    queryKey: ["trakt-status"],
    queryFn: () => watchFetch<ConnStatus>("/trakt/status"),
  });
  const anilist = useQuery({
    queryKey: ["anilist-status"],
    queryFn: () => watchFetch<ConnStatus>("/anilist/status"),
  });
  const identity = useQuery({
    queryKey: ["api-keys-identity"],
    queryFn: () => api<IdentityResponse>("/api-keys/identity"),
  });

  function applyFile(next: File | null) {
    if (!next) return;
    const lower = next.name.toLowerCase();
    const ok =
      lower.endsWith(".zip") ||
      lower.endsWith(".csv") ||
      next.type === "application/zip" ||
      next.type === "text/csv";
    if (!ok) {
      setImportMsg("Use a Letterboxd export .zip or a .csv file.");
      return;
    }
    setFile(next);
    setImportMsg(null);

    if (lower.endsWith(".csv")) {
      const kind = kindFromFileName(next.name) ?? "diary";
      setInclude({
        diary: kind === "diary",
        ratings: kind === "ratings",
        watched: kind === "watched",
        watchlist: kind === "watchlist",
      });
    } else {
      setInclude({
        diary: true,
        ratings: true,
        watched: true,
        watchlist: true,
      });
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files?.[0] ?? null);
  }

  function toggleKind(kind: LetterboxdKind) {
    setInclude((prev) => ({ ...prev, [kind]: !prev[kind] }));
  }

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startProgressPoll() {
    stopPoll();
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const job = await watchFetch<LetterboxdJob | null>("/imports/active");
          if (!job || job.status !== "running") return;
          setProgress(job);
          if (job.total > 0) {
            setImportMsg(
              `Importing… ${job.processed.toLocaleString()} / ${job.total.toLocaleString()}`,
            );
          } else if (job.processed > 0) {
            setImportMsg(
              `Importing… ${job.processed.toLocaleString()} rows`,
            );
          }
        } catch {
          // ignore transient poll errors while POST is in flight
        }
      })();
    }, 800);
  }

  useEffect(() => () => stopPoll(), []);

  async function onImport() {
    if (!file || busy) return;
    const selected = LETTERBOXD_KINDS.filter((k) => include[k.id]).map(
      (k) => k.id,
    );
    if (!selected.length) {
      setImportMsg("Pick at least one CSV to import.");
      return;
    }

    setBusy(true);
    setProgress(null);
    setImportMsg("Importing…");
    startProgressPoll();
    void qc.invalidateQueries({ queryKey: ["watch-sync-status"] });
    void qc.invalidateQueries({ queryKey: ["shell-sync-status"] });

    const body = new FormData();
    body.append("file", file);
    body.append("include", selected.join(","));
    try {
      const res = await fetch(watchUrl("/imports/letterboxd"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await res.json()) as {
        accepted?: number;
        skipped?: number;
        files?: string[];
        warnings?: string[];
        message?: string | string[];
      };
      if (!res.ok) {
        const msg = Array.isArray(json.message)
          ? json.message.join("; ")
          : typeof json.message === "string"
            ? json.message
            : JSON.stringify(json);
        throw new Error(msg);
      }
      const used =
        json.files?.length ? ` · ${json.files.join(", ")}` : "";
      const warn =
        json.warnings?.length ? ` · warnings: ${json.warnings.join("; ")}` : "";
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              accepted: json.accepted ?? prev.accepted,
              skipped: json.skipped ?? prev.skipped,
              processed:
                (json.accepted ?? prev.accepted) +
                (json.skipped ?? prev.skipped),
              percent: 100,
            }
          : {
              id: "done",
              status: "completed",
              total: (json.accepted ?? 0) + (json.skipped ?? 0),
              accepted: json.accepted ?? 0,
              skipped: json.skipped ?? 0,
              processed: (json.accepted ?? 0) + (json.skipped ?? 0),
              percent: 100,
            },
      );
      setImportMsg(
        `Imported ${json.accepted ?? 0} rows (${json.skipped ?? 0} skipped)${used}${warn}.`,
      );
      void qc.invalidateQueries({ queryKey: ["watch-overview"] });
      void qc.invalidateQueries({ queryKey: ["watch-recent"] });
      void qc.invalidateQueries({ queryKey: ["watch-sync-status"] });
    void qc.invalidateQueries({ queryKey: ["shell-sync-status"] });
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed");
      setProgress(null);
    } finally {
      stopPoll();
      setBusy(false);
    }
  }

  const traktConnected = Boolean(trakt.data?.connected);
  const anilistConnected = Boolean(anilist.data?.connected);
  const webhookActive = Boolean(
    (identity.data?.keys || []).find((k) => k.type === "watch_webhook"),
  );
  const showTrakt = traktConnected || Boolean(expanded.trakt);
  const showAnilist = anilistConnected || Boolean(expanded.anilist);
  const showWebhook = webhookActive || Boolean(expanded.webhook);
  const showingLive = showTrakt || showAnilist || showWebhook;
  const unused: { id: LiveSourceId; label: string; hint: string }[] = [];
  if (!traktConnected) {
    unused.push({
      id: "trakt",
      label: "Trakt",
      hint: "OAuth · watched history sync",
    });
  }
  if (!anilistConnected) {
    unused.push({
      id: "anilist",
      label: "AniList",
      hint: "OAuth · anime + manga",
    });
  }
  if (!webhookActive) {
    unused.push({
      id: "webhook",
      label: "Plex / Jellyfin",
      hint: "Live webhooks",
    });
  }
  const chooserOptions = unused.filter((opt) => {
    if (opt.id === "trakt") return !showTrakt;
    if (opt.id === "anilist") return !showAnilist;
    return !showWebhook;
  });

  function selectSource(id: LiveSourceId) {
    setExpanded((prev) => ({ ...prev, [id]: true }));
    setAddOpen(false);
  }

  const importOk = importMsg?.startsWith("Imported") ?? false;
  const importFailed =
    importMsg != null &&
    !importMsg.startsWith("Imported") &&
    !importMsg.startsWith("Import");
  const isCsv = Boolean(file?.name.toLowerCase().endsWith(".csv"));

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="Sources"
        description="Connect a live source to keep Watch up to date. Enrich with a Letterboxd history export below."
      />

      <section className="mb-10">
        <SectionHeading
          eyebrow="Live"
          title="Live sources"
          description="Active connections that sync ongoing watches."
          action={
            chooserOptions.length > 0 && showingLive ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAddOpen((v) => !v)}
              >
                {addOpen ? "Cancel" : "Add source"}
              </button>
            ) : null
          }
        />

        {!showingLive ? (
          <Panel className="p-5">
            <p className="text-sm text-[var(--ink)]">No live source yet.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Connect Trakt or AniList, or set up Plex / Jellyfin webhooks.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {chooserOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => selectSource(opt.id)}
                >
                  {opt.id === "webhook" ? "Set up" : "Connect"} {opt.label}
                </button>
              ))}
            </div>
          </Panel>
        ) : null}

        {addOpen && chooserOptions.length > 0 && showingLive ? (
          <Panel className="mb-4 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Add source
            </p>
            <ul className="mt-3 space-y-2">
              {chooserOptions.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2.5 text-left hover:border-[var(--muted)]"
                    onClick={() => selectSource(opt.id)}
                  >
                    <span>
                      <span className="block text-sm text-[var(--ink)]">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--faint)]">
                        {opt.hint}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-[var(--accent)]">
                      {opt.id === "webhook" ? "Set up" : "Connect"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {showingLive ? (
          <div className="grid gap-4 md:grid-cols-2">
            {showTrakt ? (
              <SourceCard
                label="OAuth"
                title="Trakt"
                blurb={
                  traktConnected
                    ? `Connected · last sync ${formatLastSync(trakt.data?.lastSyncedAt)}`
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
                  <a
                    href={watchUrl("/trakt/authorize")}
                    className="btn btn-secondary"
                  >
                    {traktConnected ? "Reconnect Trakt" : "Connect Trakt"}
                  </a>
                </div>
              </SourceCard>
            ) : null}

            {showAnilist ? (
              <SourceCard
                label="OAuth"
                title="AniList"
                blurb={
                  anilistConnected
                    ? `Connected · last sync ${formatLastSync(anilist.data?.lastSyncedAt)}`
                    : "Connect AniList to sync anime into Watch (manga syncs into Read when enabled)."
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
                    {anilistConnected ? "Reconnect AniList" : "Connect AniList"}
                  </a>
                </div>
              </SourceCard>
            ) : null}

            {showWebhook ? (
              <SourceCard
                label="Live ingest"
                title="Plex / Jellyfin"
                blurb="Point player webhooks at these URLs, then generate a personal key."
                status={
                  webhookActive ? (
                    <StatusPill tone="ok">Active</StatusPill>
                  ) : (
                    <StatusPill tone="idle">Setup</StatusPill>
                  )
                }
              >
                <ul className="mb-4 space-y-1.5 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
                  <li className="break-all">
                    <span className="text-[var(--faint)]">POST</span> {getWatchUrl()}
                    /webhooks/plex
                  </li>
                  <li className="break-all">
                    <span className="text-[var(--faint)]">POST</span> {getWatchUrl()}
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
            ) : null}
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeading
          eyebrow="Enrich"
          title="Enrich with history"
          description="Import a Letterboxd export to backfill past watches. This does not replace a live source."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SourceCard
            label="Import"
            title="Letterboxd"
            blurb="Drop the official Letterboxd export zip (or a single CSV). Pick which files to import — no scraping."
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
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragging(false);
              }}
              onDrop={onDrop}
              className={`rounded border border-dashed px-4 py-6 text-center transition-colors ${
                dragging
                  ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                  : "border-[var(--line)] bg-[var(--bg-2)] hover:border-[var(--muted)]"
              }`}
            >
              <p className="text-sm text-[var(--ink)]">
                {file
                  ? file.name
                  : "Drop letterboxd export.zip or a CSV here"}
              </p>
              <p className="mt-1 text-xs text-[var(--faint)]">
                or click to choose · max 20&nbsp;MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.zip,text/csv,application/zip"
                className="sr-only"
                disabled={busy}
                onChange={onInputChange}
              />
            </div>

            <fieldset className="mt-4 space-y-2" disabled={busy}>
              <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                Include
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {LETTERBOXD_KINDS.map((k) => (
                  <label
                    key={k.id}
                    className={`flex cursor-pointer items-start gap-2 rounded border px-2.5 py-2 text-sm ${
                      include[k.id]
                        ? "border-[var(--line)] bg-[var(--bg-2)] text-[var(--ink)]"
                        : "border-transparent text-[var(--muted)]"
                    } ${isCsv && !include[k.id] ? "opacity-40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={include[k.id]}
                      disabled={isCsv && !include[k.id]}
                      onChange={() => toggleKind(k.id)}
                    />
                    <span>
                      <span className="font-mono text-[12px]">{k.label}</span>
                      <span className="mt-0.5 block text-xs text-[var(--faint)]">
                        {k.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!file || busy}
                onClick={() => void onImport()}
              >
                {busy ? "Importing…" : "Import"}
              </button>
              {file ? (
                <button
                  type="button"
                  className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
                  disabled={busy}
                  onClick={() => {
                    setFile(null);
                    setImportMsg(null);
                  }}
                >
                  Clear
                </button>
              ) : null}
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
            {progress ? <LetterboxdProgress job={progress} /> : null}
          </SourceCard>
        </div>
      </section>
    </>
  );
}
