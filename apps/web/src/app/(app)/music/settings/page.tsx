"use client";

import { useResource, useStore } from "@questorylabs/qhttp/react";
import { LastFmScrobblerCard } from "@/components/music/LastFmScrobblerCard";
import { MultiScrobblerCard } from "@/components/music/MultiScrobblerCard";
import {
  MusicSectionHeading,
  MusicSourceCard,
  MusicStatusPill,
} from "@/components/music/MusicSourceCard";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { musicUrl } from "@/lib/music";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
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
  nativeScrobbling?: boolean;
};

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

export default function MusicSettingsPage() {
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [lastfmFlash, setLastfmFlash] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const identity = useResource({
    id: ["api-keys-identity"],
    load: () => api<IdentityResponse>("/api-keys/identity"),
  });
  const ingestActive = Boolean(
    (identity.value?.keys || []).find((k) => k.type === "music_ingest"),
  );
  const nativeLocked = Boolean(identity.value?.nativeScrobbling);

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
      void store.touch(["music-overview"]);
      void store.touch(["music-recent"]);
      void store.touch(["shell-sync-status"]);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lastfm = params.get("lastfm");
    if (lastfm === "connected") setLastfmFlash("connected");
    if (lastfm === "error") setLastfmFlash(params.get("reason") || "error");
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
      <MusicStatusPill tone="ok">Done</MusicStatusPill>
    ) : failed ? (
      <MusicStatusPill tone="warn">Error</MusicStatusPill>
    ) : jobId || restoring ? (
      <MusicStatusPill tone="warn">Running</MusicStatusPill>
    ) : (
      <MusicStatusPill tone="idle">Upload</MusicStatusPill>
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
        description="Connect Last.fm for live polling, or point multi-scrobbler at the ListenBrainz ingest API. Native scrobbling and ListenBrainz ingest cannot run at the same time."
      />

      {lastfmFlash === "connected" ? (
        <p className="mb-4 text-sm text-[var(--accent)]">
          Last.fm connected — ListenBrainz ingest is now disabled for this account.
        </p>
      ) : null}
      {lastfmFlash && lastfmFlash !== "connected" ? (
        <p className="mb-4 text-sm text-[var(--danger)]" role="alert">
          Could not connect Last.fm{lastfmFlash !== "error" ? `: ${lastfmFlash}` : ""}.
        </p>
      ) : null}

      <section className="mb-10">
        <MusicSectionHeading
          eyebrow="Live"
          title="Live sources"
          description="Native Last.fm polling, or ListenBrainz-compatible ingest. Connecting Last.fm disables multi-scrobbler for this user."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <LastFmScrobblerCard />
          <MultiScrobblerCard
            active={ingestActive}
            nativeLocked={nativeLocked}
          />
        </div>
      </section>

      <section>
        <MusicSectionHeading
          eyebrow="Enrich"
          title="Enrich with history"
          description="Import past listens from Koito, Spotify, Maloja, Last.fm, or ListenBrainz. This does not replace live ingest."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <MusicSourceCard
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
          </MusicSourceCard>

          <MusicSourceCard
            label="Formats"
            title="Filename hints"
            blurb="Same conventions as Koito: include these substrings so auto-detect is reliable."
            status={<MusicStatusPill tone="idle">Reference</MusicStatusPill>}
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
          </MusicSourceCard>
        </div>
      </section>
    </>
  );
}
