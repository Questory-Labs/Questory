"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { EmptyState, SkeletonTile } from "@questorylabs/ui";
import type { PlayNextItem } from "@questorylabs/shared";
import type { DashboardOccupancy } from "../dashboard-occupancy";

export const PlayNextSection = ({
  occupancy,
  playNextEmpty,
  picks,
  syncing,
  steamLinked,
}: {
  occupancy: DashboardOccupancy;
  playNextEmpty: boolean;
  picks: PlayNextItem[];
  syncing: boolean;
  steamLinked: boolean;
}) => (
  <section
    aria-labelledby="dashboard-next"
    className="panel q-lift q-in min-w-0 flex-[1_1_300px] px-3 pb-2.5 pt-[18px]"
    style={{ "--i": 9 } as CSSProperties}
  >
    <div className="mx-2 mb-2 flex items-baseline justify-between gap-3">
      <h2 id="dashboard-next" className="m-0 text-base font-normal">
        Up next
      </h2>
      <Link
        href="/library"
        className="text-[13px] text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        Full library
      </Link>
    </div>
    {occupancy.playNextError ? (
      <EmptyState
        title={
          <span className="text-[var(--danger)]">Could not load play-next picks.</span>
        }
      />
    ) : playNextEmpty ? (
      occupancy.showContinue ? (
        <p className="mx-2 text-sm text-[var(--muted)]">Picks loading…</p>
      ) : (
        <SkeletonTile className="mx-2" />
      )
    ) : picks.length ? (
      <ul className="m-0 list-none p-0">
        {picks.map((pick, i) => (
          <li key={pick.appId}>
            <Link
              href={`/library/${pick.appId}`}
              className="q-row flex min-h-12 items-center gap-3 rounded-[14px] px-2 no-underline"
            >
              <span className="font-mono text-[10px] text-[var(--dim)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-normal">{pick.name}</span>
                {pick.reasons.length ? (
                  <span className="block truncate text-xs text-[var(--faint)]">
                    {pick.reasons.slice(0, 2).join(" · ")}
                  </span>
                ) : null}
              </span>
              <span
                className="text-xl font-extralight"
                title={`${Math.round(pick.playtimeForever / 60)} hours played`}
              >
                {Math.round(pick.playtimeForever / 60)}
                <span className="text-[11px] text-[var(--faint)]"> h</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState
        title={
          syncing
            ? "Library sync is still running — play-next picks will show up shortly."
            : steamLinked
              ? "Sync your library to get weekly play-next picks."
              : "Link Steam from Connections to sync your library."
        }
      />
    )}
  </section>
);
