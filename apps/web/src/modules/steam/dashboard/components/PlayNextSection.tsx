"use client";

import Link from "next/link";
import { EmptyState, Panel, SkeletonTile } from "@questorylabs/ui";
import { GameCover } from "@/components/GameCover";
import type { PlayNextItem } from "@questorylabs/shared";
import type { DashboardOccupancy } from "../dashboard-occupancy";

export const PlayNextSection = ({
  occupancy,
  playNextEmpty,
  featured,
  restPicks,
  syncing,
  steamLinked,
}: {
  occupancy: DashboardOccupancy;
  playNextEmpty: boolean;
  featured: PlayNextItem | undefined;
  restPicks: PlayNextItem[];
  syncing: boolean;
  steamLinked: boolean;
}) => (
  <section className="mt-10">
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">Play next</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Backlog picks from genres you play, Deck fit, and forgotten gems
        </p>
      </div>
      <Link
        href="/library"
        className="shrink-0 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        Full library →
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
        <p className="text-sm text-[var(--muted)]">Picks loading…</p>
      ) : (
        <SkeletonTile className="max-w-xl" />
      )
    ) : featured ? (
      <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <PlayNextFeatured pick={featured} />
        <div className="space-y-2">
          {restPicks.map((g) => (
            <PlayNextRow key={g.appId} pick={g} />
          ))}
        </div>
      </div>
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

const PlayNextFeatured = ({ pick }: { pick: PlayNextItem }) => (
  <Link href={`/library/${pick.appId}`} className="block">
    <Panel size="md" className="overflow-hidden">
      <GameCover src={pick.headerImage} className="w-full" />
      <div className="border-t border-[var(--line)] px-4 py-3">
        <h3 className="truncate font-medium">{pick.name}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {pick.reasons.slice(0, 2).join(" · ") ||
            `${Math.round(pick.playtimeForever / 60)}h`}
        </p>
      </div>
    </Panel>
  </Link>
);

const PlayNextRow = ({ pick }: { pick: PlayNextItem }) => (
  <Link href={`/library/${pick.appId}`} className="block">
    <Panel
      variant="outline"
      className="flex items-start gap-3 px-3 py-2 hover:border-[var(--line-strong)]"
    >
      <GameCover src={pick.headerImage} className="w-28 shrink-0" />
      <div className="min-w-0 pt-0.5">
        <h3 className="truncate text-sm font-medium">{pick.name}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {pick.reasons.slice(0, 2).join(" · ")}
        </p>
      </div>
    </Panel>
  </Link>
);
