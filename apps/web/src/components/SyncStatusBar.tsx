"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  useShellSyncStatus,
  type MusicImportJob,
} from "@/hooks/useShellSyncStatus";

type SourceRow = {
  id: string;
  label: string;
  headline: string;
  detail: string;
  href: string;
  active: boolean;
  progress?: { done: number; total: number } | null;
};

function ProgressTrack({
  done,
  total,
  active,
  label,
}: {
  done: number;
  total: number;
  active: boolean;
  label: string;
}) {
  const pct = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0;
  return (
    <div
      className="mt-2 h-1 overflow-hidden bg-[var(--bg-2)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.max(1, total)}
      aria-valuenow={Math.min(total, Math.floor(done))}
      aria-label={label}
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
 * Shell banner for in-flight Steam / Music / Watch / Read sync & imports.
 * Mirrors the Steam sync bar, with one row per active source.
 */
export function SyncStatusBar({
  steamEnabled = false,
  musicEnabled = false,
  watchEnabled = false,
  readEnabled = false,
}: {
  steamEnabled?: boolean;
  musicEnabled?: boolean;
  watchEnabled?: boolean;
  readEnabled?: boolean;
}) {
  const shell = useShellSyncStatus({
    steamEnabled,
    musicEnabled,
    watchEnabled,
    readEnabled,
  });

  const [dismissed, setDismissed] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const sawActive = useRef({
    steam: false,
    music: false,
    watch: false,
    read: false,
  });
  const lastMusicJob = useRef<MusicImportJob | null>(null);
  const lastWatchDetail = useRef<string>("");

  const anyActive =
    shell.steam.active ||
    shell.music.active ||
    shell.watch.active ||
    shell.read.active;

  useEffect(() => {
    if (shell.music.job) lastMusicJob.current = shell.music.job;
  }, [shell.music.job]);

  useEffect(() => {
    if (shell.steam.active) sawActive.current.steam = true;
    if (shell.music.active) sawActive.current.music = true;
    if (shell.watch.active) {
      sawActive.current.watch = true;
      const parts: string[] = [];
      if (shell.watch.letterboxd) {
        const lb = shell.watch.letterboxd;
        parts.push(
          lb.total > 0
            ? `Letterboxd · ${lb.processed.toLocaleString()} / ${lb.total.toLocaleString()}`
            : lb.processed > 0
              ? `Letterboxd · ${lb.processed.toLocaleString()} rows`
              : "Letterboxd · importing export…",
        );
      }
      if (shell.watch.traktSyncing) parts.push("Trakt sync");
      if (shell.watch.anilistSyncing) parts.push("AniList sync");
      if (shell.watch.animeListSyncing) parts.push("Anime list sync");
      if (parts.length) lastWatchDetail.current = parts.join(" · ");
    }
    if (shell.read.active) sawActive.current.read = true;
  }, [
    shell.steam.active,
    shell.music.active,
    shell.watch.active,
    shell.watch.letterboxd,
    shell.watch.traktSyncing,
    shell.watch.anilistSyncing,
    shell.watch.animeListSyncing,
    shell.read.active,
  ]);

  useEffect(() => {
    if (anyActive) {
      setCelebrate(false);
      setDismissed(false);
      return;
    }
    const finished =
      sawActive.current.steam ||
      sawActive.current.music ||
      sawActive.current.watch ||
      sawActive.current.read;
    if (!finished) return;
    setCelebrate(true);
    const t = window.setTimeout(() => {
      setCelebrate(false);
      setDismissed(true);
      sawActive.current = {
        steam: false,
        music: false,
        watch: false,
        read: false,
      };
      lastMusicJob.current = null;
      lastWatchDetail.current = "";
    }, 8_000);
    return () => window.clearTimeout(t);
  }, [anyActive]);

  const rows: SourceRow[] = [];

  const showSteam =
    steamEnabled &&
    (shell.steam.active || (celebrate && sawActive.current.steam));
  if (showSteam) {
    rows.push({
      id: "steam",
      label: "Steam",
      headline: shell.steam.active
        ? "Syncing your Steam library"
        : "Steam sync finished",
      detail: shell.steam.active
        ? shell.steam.current
          ? `${shell.steam.current.label} · ${shell.steam.doneCount} of ${shell.steam.total} complete`
          : "Pulling library, wishlist, friends, and details…"
        : "Library, wishlist, and friends are ready to browse.",
      href: "/settings/connections",
      active: shell.steam.active,
      progress:
        shell.steam.active || shell.steam.hasJobs
          ? {
              done:
                shell.steam.doneCount +
                (shell.steam.active && shell.steam.current ? 0.35 : 0),
              total: shell.steam.total,
            }
          : null,
    });
  }

  const showMusic =
    musicEnabled &&
    (shell.music.active || (celebrate && sawActive.current.music));
  if (showMusic) {
    const job = shell.music.job ?? lastMusicJob.current;
    const parsing = job?.phase === "parsing";
    rows.push({
      id: "music",
      label: "Music",
      headline: shell.music.active
        ? parsing
          ? "Parsing music import"
          : "Importing listening history"
        : "Music import finished",
      detail: shell.music.active
        ? parsing
          ? job?.fileName || "Reading upload…"
          : `${(job?.processed ?? 0).toLocaleString()} / ${(job?.total ?? 0).toLocaleString()} listens · ${job?.accepted ?? 0} accepted`
        : `${(job?.accepted ?? 0).toLocaleString()} listens imported`,
      href: "/music/settings",
      active: shell.music.active,
      progress:
        shell.music.active && job && job.total > 0
          ? { done: job.processed, total: job.total }
          : null,
    });
  }

  const showWatch =
    watchEnabled &&
    (shell.watch.active || (celebrate && sawActive.current.watch));
  if (showWatch) {
    const parts: string[] = [];
    if (shell.watch.letterboxd) {
      const lb = shell.watch.letterboxd;
      parts.push(
        lb.total > 0
          ? `Letterboxd · ${lb.processed.toLocaleString()} / ${lb.total.toLocaleString()}`
          : lb.processed > 0
            ? `Letterboxd · ${lb.processed.toLocaleString()} rows`
            : "Letterboxd · importing export…",
      );
    }
    if (shell.watch.traktSyncing) parts.push("Trakt sync");
    if (shell.watch.anilistSyncing) parts.push("AniList sync");

    rows.push({
      id: "watch",
      label: "Watch",
      headline: shell.watch.active
        ? "Syncing your Watch library"
        : "Watch sync finished",
      detail: parts.length
        ? parts.join(" · ")
        : lastWatchDetail.current || "Movies and shows are up to date.",
      href: "/watch/settings",
      active: shell.watch.active,
      progress:
        shell.watch.letterboxd && shell.watch.letterboxd.total > 0
          ? {
              done: shell.watch.letterboxd.processed,
              total: shell.watch.letterboxd.total,
            }
          : null,
    });
  }

  // Prefer Watch's AniList row when both flags are on (shared OAuth sync).
  const showRead =
    readEnabled &&
    (shell.read.active || (celebrate && sawActive.current.read)) &&
    !(watchEnabled && (shell.watch.anilistSyncing || shell.watch.animeListSyncing));
  if (showRead) {
    rows.push({
      id: "read",
      label: "Read",
      headline: shell.read.active
        ? "Syncing your Read library"
        : "Read sync finished",
      detail: shell.read.active
        ? shell.read.anilistSyncing
          ? "AniList manga sync"
          : shell.read.animeListSyncing
            ? "Anime list manga sync"
            : "Read library sync"
        : "Manga and print lists are up to date.",
      href: "/read/settings",
      active: shell.read.active,
      progress: null,
    });
  }

  const visible = !dismissed && rows.length > 0 && (anyActive || celebrate);
  if (!visible) return null;

  return (
    <div
      className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-1)_92%,transparent)] px-4 py-2.5 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {row.active ? (
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warm)]"
                    aria-hidden
                  />
                ) : null}
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  {row.label}
                </span>
                <span className="text-sm text-[var(--ink)]">{row.headline}</span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{row.detail}</p>
              {row.progress ? (
                <ProgressTrack
                  done={row.progress.done}
                  total={row.progress.total}
                  active={row.active}
                  label={`${row.label} sync progress`}
                />
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {row.active ? (
                <Link
                  href={row.href}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] hover:underline"
                >
                  Details
                </Link>
              ) : (
                <button
                  type="button"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)] hover:text-[var(--ink)]"
                  onClick={() => setDismissed(true)}
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
