import type { ImportJob } from "../music.settings.types";

export const ImportProgress = ({ job }: { job: ImportJob }) => {
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
};
