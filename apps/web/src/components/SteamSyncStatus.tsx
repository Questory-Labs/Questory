"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui";
import { useSyncJobs, type SyncStage } from "@/hooks/useSyncJobs";
import type { SyncJob } from "@questorylabs/shared";

type Variant = "panel" | "bar";

function statusTone(status: SyncJob["status"] | undefined) {
  if (status === "running") return "text-[var(--warm)]";
  if (status === "completed") return "text-[var(--accent)]";
  if (status === "failed") return "text-[var(--danger)]";
  return "text-[var(--faint)]";
}

function statusLabel(status: SyncJob["status"] | undefined, waiting: boolean) {
  if (waiting && !status) return "Queued";
  if (status === "pending") return "Queued";
  if (status === "running") return "Running";
  if (status === "completed") return "Done";
  if (status === "failed") return "Failed";
  return "Waiting";
}

function StatusDot({ status }: { status: SyncJob["status"] | undefined }) {
  const base =
    "mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-[var(--bg-1)]";
  if (status === "running") {
    return (
      <span
        className={`${base} bg-[var(--warm)] animate-pulse`}
        aria-hidden
      />
    );
  }
  if (status === "completed") {
    return <span className={`${base} bg-[var(--accent)]`} aria-hidden />;
  }
  if (status === "failed") {
    return <span className={`${base} bg-[var(--danger)]`} aria-hidden />;
  }
  if (status === "pending") {
    return (
      <span
        className={`${base} border border-[var(--warm)] bg-transparent`}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={`${base} border border-[var(--line-strong)] bg-transparent`}
      aria-hidden
    />
  );
}

function StageRow({ stage, expectJobs }: { stage: SyncStage; expectJobs: boolean }) {
  const status = stage.job?.status;
  return (
    <li className="flex items-start gap-3 border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <StatusDot status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">
            {stage.label}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.14em] ${statusTone(status)}`}
          >
            {statusLabel(status, expectJobs)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{stage.detail}</p>
        {status === "failed" && stage.job?.error ? (
          <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
            {stage.job.error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function ProgressTrack({ done, total, active }: { done: number; total: number; active: boolean }) {
  const pct = Math.round((Math.min(done, total) / total) * 100);
  return (
    <div
      className="mt-3 h-1 overflow-hidden bg-[var(--bg-2)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(total, Math.floor(done))}
      aria-label="Steam sync progress"
    >
      <div
        className={`h-full transition-[width] duration-500 ease-out ${
          active ? "bg-[var(--warm)]" : "bg-[var(--accent)]"
        }`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/**
 * Live Steam sync status.
 * - `panel`: checklist for Connections (and just-linked flow)
 * - `bar`: compact shell banner while jobs are active / just finished
 */
export function SteamSyncStatus({
  variant = "panel",
  forceVisible = false,
  enabled = true,
}: {
  variant?: Variant;
  /** Keep visible after redirect even before first job row lands. */
  forceVisible?: boolean;
  enabled?: boolean;
}) {
  const sync = useSyncJobs({ enabled });
  const [celebrate, setCelebrate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const sawActive = useRef(false);
  const wasForced = useRef(false);

  // Re-open when a fresh post-link redirect asks us to show status.
  useEffect(() => {
    if (forceVisible && !wasForced.current) setDismissed(false);
    wasForced.current = forceVisible;
  }, [forceVisible]);

  // Brief success state after sync finishes (including fast inline sync on mount).
  useEffect(() => {
    if (sync.active) {
      sawActive.current = true;
      setCelebrate(false);
      setDismissed(false);
      return;
    }
    const finishedHere = sawActive.current && sync.allDone;
    const finishedBeforeMount =
      forceVisible && sync.allDone && sync.hasJobs && !sawActive.current;
    if (!finishedHere && !finishedBeforeMount) return;
    setCelebrate(true);
    const t = window.setTimeout(() => {
      setCelebrate(false);
      setDismissed(true);
      sawActive.current = false;
    }, variant === "bar" ? 8_000 : 12_000);
    return () => window.clearTimeout(t);
  }, [sync.active, sync.allDone, sync.hasJobs, forceVisible, variant]);

  const expectJobs = forceVisible || sync.active || sync.hasJobs;
  const recentFailures = sync.failed.filter((stage) => {
    const at = stage.job?.finishedAt;
    if (!at) return true;
    return Date.now() - new Date(at).getTime() < 30 * 60 * 1000;
  });
  const showFailed = recentFailures.length > 0 && !sync.active;
  const visible =
    enabled &&
    !dismissed &&
    (sync.active ||
      forceVisible ||
      celebrate ||
      (showFailed && (variant === "panel" || forceVisible)));

  if (!visible) return null;

  const headline = sync.active
    ? "Syncing your Steam library"
    : showFailed
      ? "Steam sync hit a snag"
      : celebrate || sync.allDone
        ? "Steam sync finished"
        : forceVisible
          ? "Starting Steam sync"
          : "Steam sync status";

  const sub = sync.active
    ? sync.current
      ? `${sync.current.label} · ${sync.doneCount} of ${sync.total} complete`
      : `Pulling library, wishlist, friends, and details…`
    : showFailed
      ? `${sync.failed.length} step${sync.failed.length === 1 ? "" : "s"} failed. The next scheduled sync will retry.`
      : celebrate || sync.allDone
        ? "Library, wishlist, and friends are ready to browse."
        : "Jobs are queued — this usually takes a minute or two.";

  if (variant === "bar") {
    return (
      <div
        className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-1)_92%,transparent)] px-4 py-2.5 sm:px-6"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {sync.active ? (
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warm)]"
                  aria-hidden
                />
              ) : null}
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                Steam sync
              </span>
              <span className="text-sm text-[var(--ink)]">{headline}</span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{sub}</p>
            {(sync.active || sync.hasJobs) && (
              <ProgressTrack
                done={sync.doneCount + (sync.active && sync.current ? 0.35 : 0)}
                total={sync.total}
                active={sync.active}
              />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!sync.active ? (
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)] hover:text-[var(--ink)]"
                onClick={() => setDismissed(true)}
              >
                Dismiss
              </button>
            ) : (
              <Link
                href="/settings/connections"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] hover:underline"
              >
                Details
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Panel className="p-5" wrapperClassName="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
            Steam sync
          </div>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {headline}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {sync.active || (forceVisible && !sync.allDone) ? (
            <span className="font-mono text-[11px] text-[var(--warm)]">
              {sync.doneCount}/{sync.total}
            </span>
          ) : sync.allDone || celebrate ? (
            <Link
              href="/library"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Open library →
            </Link>
          ) : null}
          {!sync.active ? (
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)] hover:text-[var(--ink)]"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>

      <ProgressTrack
        done={sync.doneCount + (sync.active && sync.current ? 0.35 : 0)}
        total={sync.total}
        active={sync.active}
      />

      <ol className="mt-4">
        {sync.stages.map((stage) => (
          <StageRow key={stage.type} stage={stage} expectJobs={expectJobs} />
        ))}
      </ol>
    </Panel>
  );
}
