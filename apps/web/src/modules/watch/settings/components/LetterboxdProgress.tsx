import type { LetterboxdJob } from "../watch.settings.types";

export const LetterboxdProgress = ({ job }: { job: LetterboxdJob }) => {
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
};
