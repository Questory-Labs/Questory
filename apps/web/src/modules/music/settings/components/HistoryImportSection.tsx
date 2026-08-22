"use client";

import {
  MusicSectionHeading,
  MusicSourceCard,
  MusicStatusPill,
} from "./MusicSourceCard";
import { MUSIC_ACCEPT } from "../music.settings.constants";
import type { MusicSettingsViewProps } from "../music.settings.types";
import { FilenameHintsCard } from "./FilenameHintsCard";
import { ImportProgress } from "./ImportProgress";

type ImportProps = Pick<
  MusicSettingsViewProps,
  | "fileName"
  | "message"
  | "jobId"
  | "job"
  | "restoring"
  | "dragging"
  | "busy"
  | "failed"
  | "showProgress"
  | "inputRef"
  | "onInputChange"
  | "onDrop"
  | "setDragging"
>;

export const HistoryImportSection = ({
  fileName,
  message,
  jobId,
  job,
  restoring,
  dragging,
  busy,
  failed,
  showProgress,
  inputRef,
  onInputChange,
  onDrop,
  setDragging,
}: ImportProps) => {
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

  return (
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
          {message ? (
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
          ) : null}
          {showProgress && job ? <ImportProgress job={job} /> : null}
          {jobId ? (
            <p className="mt-1 font-mono text-[11px] text-[var(--faint)]">
              Job {jobId}
              {job?.source ? ` · ${job.source}` : ""}
            </p>
          ) : null}
        </MusicSourceCard>

        <FilenameHintsCard />
      </div>
    </section>
  );
};
