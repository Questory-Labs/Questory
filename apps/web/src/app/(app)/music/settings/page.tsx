"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { PageHeader, Panel } from "@/components/ui";
import { MUSIC_URL, musicUrl } from "@/lib/music";
import { useEffect, useRef, useState, type ReactNode } from "react";

type ImportStart = {
  ok: boolean;
  jobId: string;
  source: string;
  status: string;
};

type ImportJob = {
  id: string;
  source: string;
  status: string;
  fileName?: string | null;
  total: number;
  accepted: number;
  skipped: number;
  processed: number;
  percent: number | null;
  phase: string;
  lastError?: string | null;
  completedAt?: string | null;
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

function ImportProgress({ job }: { job: ImportJob }) {
  const running = job.status === "running";
  const parsing = running && job.phase === "parsing";
  const pct = job.percent ?? 0;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-[var(--faint)]">
        <span>
          {parsing
            ? "Parsing file…"
            : running
              ? `Importing ${job.processed.toLocaleString()} / ${job.total.toLocaleString()}`
              : job.status === "completed"
                ? `Done · ${job.accepted.toLocaleString()} imported`
                : "Stopped"}
        </span>
        <span>
          {parsing ? "…" : job.percent != null ? `${job.percent}%` : ""}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-3)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={parsing ? undefined : pct}
        aria-label="Import progress"
      >
        <div
          className={`h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out ${
            parsing ? "w-1/3 animate-pulse" : ""
          }`}
          style={parsing ? undefined : { width: `${pct}%` }}
        />
      </div>
      {running && !parsing ? (
        <p className="font-mono text-[11px] text-[var(--muted)]">
          {job.accepted.toLocaleString()} accepted ·{" "}
          {job.skipped.toLocaleString()} skipped
        </p>
      ) : null}
      {job.status === "completed" ? (
        <p className="font-mono text-[11px] text-[var(--muted)]">
          Metadata enrichment continues in the background (genres, moods, year,
          cover art).
        </p>
      ) : null}
    </div>
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

export default function MusicSettingsPage() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [restoring, setRestoring] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function applyJob(next: ImportJob) {
    setJob(next);
    setJobId(next.id);
    if (next.fileName) setFileName(next.fileName);

    if (next.status === "completed") {
      stopPoll();
      setMessage(
        `Imported ${next.accepted} listens (${next.skipped} skipped).`,
      );
      void qc.invalidateQueries({ queryKey: ["music-overview"] });
      void qc.invalidateQueries({ queryKey: ["music-recent"] });
      return;
    }
    if (next.status === "failed") {
      stopPoll();
      setMessage(next.lastError || "Import failed");
      return;
    }
    if (next.phase === "parsing") {
      setMessage("Parsing import file…");
      return;
    }
    setMessage(
      `Importing… ${next.processed.toLocaleString()} / ${next.total.toLocaleString()}`,
    );
  }

  function startPoll(id: string) {
    stopPoll();
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(musicUrl(`/imports/${id}`), {
            credentials: "include",
            cache: "no-store",
          });
          if (!res.ok) throw new Error(await res.text());
          const next = (await res.json()) as ImportJob;
          applyJob(next);
        } catch (err) {
          stopPoll();
          setMessage(err instanceof Error ? err.message : "Import failed");
        }
      })();
    }, 1000);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(musicUrl("/imports/active"), {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const active = (await res.json()) as ImportJob | null;
        if (cancelled) return;
        if (active?.status === "running") {
          applyJob(active);
          startPoll(active.id);
        }
      } catch {
        // No active job / music briefly unavailable — ignore on load.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
      stopPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume once on mount
  }, []);

  async function onUpload(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setMessage("Uploading…");
    setJob(null);
    setJobId(null);
    stopPoll();

    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch(musicUrl("/imports"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await res.json()) as ImportStart &
        ImportJob & {
          message?: string | { message?: string; jobId?: string };
          jobId?: string;
        };
      const conflictJobId =
        typeof json.jobId === "string"
          ? json.jobId
          : typeof json.message === "object" &&
              json.message &&
              typeof json.message.jobId === "string"
            ? json.message.jobId
            : null;
      if (res.status === 409 && conflictJobId) {
        setMessage("An import is already in progress — resuming…");
        startPoll(conflictJobId);
        const activeRes = await fetch(musicUrl(`/imports/${conflictJobId}`), {
          credentials: "include",
          cache: "no-store",
        });
        if (activeRes.ok) {
          applyJob((await activeRes.json()) as ImportJob);
        }
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof json.message === "string" && json.message
            ? json.message
            : JSON.stringify(json),
        );
      }
      setJobId(json.jobId);
      setMessage(`Import started (${json.source})…`);
      if ("phase" in json) {
        applyJob(json as ImportJob);
      }
      startPoll(json.jobId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    }
  }

  const failed =
    job?.status === "failed" ||
    (message != null &&
      !message.startsWith("Imported") &&
      !message.startsWith("Import") &&
      !message.startsWith("Upload") &&
      !message.startsWith("Parsing") &&
      !message.startsWith("An import"));

  const pill =
    job?.status === "completed" ? (
      <StatusPill tone="ok">Done</StatusPill>
    ) : failed ? (
      <StatusPill tone="warn">Error</StatusPill>
    ) : jobId || restoring ? (
      <StatusPill tone="warn">Running</StatusPill>
    ) : (
      <StatusPill tone="idle">Upload</StatusPill>
    );

  const showProgress =
    job != null &&
    (job.status === "running" ||
      job.status === "completed" ||
      job.status === "failed");

  return (
    <>
      <PageHeader
        eyebrow="Music"
        title="Sources"
        description="Import listening history from Koito, Spotify, Maloja, Last.fm, or ListenBrainz — or point multi-scrobbler at the ListenBrainz-compatible ingest API."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SourceCard
          label="Import"
          title="History upload"
          blurb="Drop a Koito SQLite database, Koito JSON export, Spotify Streaming_History_Audio JSON, Maloja export, Last.fm recenttracks JSON, or ListenBrainz export zip. Format is detected from the filename and contents."
          status={pill}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn btn-secondary inline-flex cursor-pointer">
              Choose file
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3,.json,.zip,application/json,application/zip"
                className="sr-only"
                disabled={job?.status === "running"}
                onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="truncate text-sm text-[var(--faint)]">
              {fileName || "No file selected"}
            </span>
          </div>
          {restoring && !job ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Checking for an import in progress…
            </p>
          ) : null}
          {message && (
            <p
              className={`mt-3 text-sm ${
                message.startsWith("Imported")
                  ? "text-[var(--accent)]"
                  : message.startsWith("Import") ||
                      message.startsWith("Upload") ||
                      message.startsWith("Parsing") ||
                      message.startsWith("An import")
                    ? "text-[var(--muted)]"
                    : "text-[var(--danger)]"
              }`}
            >
              {message}
            </p>
          )}
          {showProgress ? <ImportProgress job={job} /> : null}
          {jobId && (
            <p className="mt-1 font-mono text-[11px] text-[var(--faint)]">
              Job {jobId}
              {job?.source ? ` · ${job.source}` : ""}
            </p>
          )}
        </SourceCard>

        <SourceCard
          label="Live ingest"
          title="Multi-scrobbler"
          blurb="Submit new listens via the ListenBrainz-compatible API. Generate a music ingest key and set the base URL in multi-scrobbler."
          status={<StatusPill tone="idle">API</StatusPill>}
        >
          <ul className="mb-4 space-y-1.5 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
            <li className="break-all">
              <span className="text-[var(--faint)]">POST</span> {MUSIC_URL}
              /1/submit-listens
            </li>
            <li className="break-all">
              <span className="text-[var(--faint)]">GET</span> {MUSIC_URL}
              /1/validate-token
            </li>
          </ul>
          <ApiKeyPanel
            embedded
            type="music_ingest"
            title="Ingest key"
            description="Shown once when generated. Rotate anytime."
          />
        </SourceCard>

        <SourceCard
          label="Formats"
          title="Filename hints"
          blurb="Same conventions as Koito: include these substrings so auto-detect is reliable."
          status={<StatusPill tone="idle">Reference</StatusPill>}
        >
          <ul className="space-y-1.5 font-mono text-[11px] text-[var(--muted)]">
            <li>
              <span className="text-[var(--ink)]">koito.db</span> /{" "}
              <span className="text-[var(--ink)]">*.sqlite</span> — Koito
              database
            </li>
            <li>
              <span className="text-[var(--ink)]">koito*.json</span> — Koito JSON
              export
            </li>
            <li>
              <span className="text-[var(--ink)]">Streaming_History_Audio</span>{" "}
              — Spotify
            </li>
            <li>
              <span className="text-[var(--ink)]">maloja</span> — Maloja export
            </li>
            <li>
              <span className="text-[var(--ink)]">recenttracks</span> — Last.fm
              (ghan.nl)
            </li>
            <li>
              <span className="text-[var(--ink)]">listenbrainz*.zip</span> —
              ListenBrainz
            </li>
          </ul>
        </SourceCard>
      </div>
    </>
  );
}
