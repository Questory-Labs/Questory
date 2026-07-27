"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { MUSIC_URL, musicUrl } from "@/lib/music";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

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

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {eyebrow}
      </div>
      <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

const MUSIC_ACCEPT =
  ".db,.sqlite,.sqlite3,.json,.zip,application/json,application/zip";

function isMusicImportFile(file: File) {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".db") ||
    lower.endsWith(".sqlite") ||
    lower.endsWith(".sqlite3") ||
    lower.endsWith(".json") ||
    lower.endsWith(".zip") ||
    file.type === "application/json" ||
    file.type === "application/zip" ||
    file.type === "application/x-sqlite3" ||
    file.type === "application/vnd.sqlite3"
  );
}

function MultiScrobblerCard({ active }: { active: boolean }) {
  return (
    <SourceCard
      label="Live ingest"
      title="Multi-scrobbler"
      blurb="Submit new listens via the ListenBrainz-compatible API. Generate a music ingest key and set the base URL in multi-scrobbler."
      status={
        active ? (
          <StatusPill tone="ok">Active</StatusPill>
        ) : (
          <StatusPill tone="idle">Setup</StatusPill>
        )
      }
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
  );
}

export default function MusicSettingsPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const identity = useQuery({
    queryKey: ["api-keys-identity"],
    queryFn: () => api<IdentityResponse>("/api-keys/identity"),
  });
  const ingestActive = Boolean(
    (identity.data?.keys || []).find((k) => k.type === "music_ingest"),
  );
  const showIngest = ingestActive || setupOpen;

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

  const busy =
    job?.status === "running" || restoring || message === "Uploading…";

  function applyFile(file: File | null) {
    if (!file || busy) return;
    if (!isMusicImportFile(file)) {
      setMessage(
        "Use a .db / .sqlite, .json, or .zip music export file.",
      );
      return;
    }
    void onUpload(file);
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
        description="Point multi-scrobbler at the ListenBrainz-compatible ingest API for live listens. Enrich with a history export below."
      />

      <section className="mb-10">
        <SectionHeading
          eyebrow="Live"
          title="Live sources"
          description="Active ingest that records new listens as they happen."
        />

        {!showIngest ? (
          <Panel className="p-5">
            <p className="text-sm text-[var(--ink)]">No live source yet.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Generate a music ingest key and point multi-scrobbler here.
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSetupOpen(true)}
              >
                Add Multi-scrobbler
              </button>
            </div>
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <MultiScrobblerCard active={ingestActive} />
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Enrich"
          title="Enrich with history"
          description="Import past listens from Koito, Spotify, Maloja, Last.fm, or ListenBrainz. This does not replace live ingest."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SourceCard
            label="Import"
            title="History upload"
            blurb="Drop a Koito SQLite database, Koito JSON export, Spotify Streaming_History_Audio JSON, Maloja export, Last.fm recenttracks JSON, or ListenBrainz export zip. Format is detected from the filename and contents."
            status={pill}
          >
            <div
              role="button"
              tabIndex={busy ? -1 : 0}
              onKeyDown={(e) => {
                if (busy) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onClick={() => {
                if (!busy) inputRef.current?.click();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragging(false);
              }}
              onDrop={onDrop}
              className={`rounded border border-dashed px-4 py-6 text-center transition-colors ${
                busy
                  ? "cursor-not-allowed border-[var(--line)] bg-[var(--bg-2)] opacity-60"
                  : dragging
                    ? "cursor-pointer border-[var(--accent)] bg-[var(--accent-dim)]"
                    : "cursor-pointer border-[var(--line)] bg-[var(--bg-2)] hover:border-[var(--muted)]"
              }`}
            >
              <p className="text-sm text-[var(--ink)]">
                {fileName || "Drop a music export here"}
              </p>
              <p className="mt-1 text-xs text-[var(--faint)]">
                or click to choose · .db / .json / .zip · max 120&nbsp;MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={MUSIC_ACCEPT}
                className="sr-only"
                disabled={busy}
                onChange={onInputChange}
              />
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
                <span className="text-[var(--ink)]">koito*.json</span> — Koito
                JSON export
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
      </section>
    </>
  );
}
