"use client";

import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useUser } from "@/hooks/useUser";
import { DashboardStats, PlayNextItem } from "@questorylabs/shared";
import { UseResourceResult } from "@questorylabs/qhttp/react";
import { formatMoney } from "@/lib/money";

import { motion } from "framer-motion";
import { EmptyState, PageHeader, SkeletonStatGrid, SkeletonTileGrid } from "@questorylabs/ui";
import { StatCard } from "@/components/StatCard";
import Link from "next/link";
import { GameTile } from "@/components/GameTile";

type DashboardViewProps = {
  recentlyPlayed: DashboardStats["recentlyPlayed"];
  nextUp: PlayNextItem[];
  stats: UseResourceResult<DashboardStats>;
  playNext: UseResourceResult<PlayNextItem[]>;
  sync: ReturnType<typeof useSyncJobs>;
};

export const DashboardView = (props: Record<string, unknown>) => {
  const { recentlyPlayed, nextUp, stats, playNext, sync } = props as DashboardViewProps;
  const { user } = useUser();
  const { active: syncing } = sync;
  const { personaName: name } = user ?? {};
  const { value } = stats ?? {};
  const isSteamLinked = Boolean(user?.steamId);
  
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 opacity-60 gen-orb"
          aria-hidden
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <PageHeader
            eyebrow="Library overview"
            title={
              name ? (
                <>
                  Hey, <span className="text-[var(--accent)]">{name}</span>
                </>
              ) : (
                "Dashboard"
              )
            }
            description={
              syncing ? (
                <>
                  Syncing Steam data
                  {sync.current ? ` · ${sync.current.label}` : ""}
                  {` · ${sync.doneCount}/${sync.total}`}. Stats will fill in as
                  jobs finish.
                </>
              ) : (
                <>Playtime, backlog, and wishlist signals in one place.</>
              )
            }
          />
        </motion.div>
      </section>

      <section aria-label="Key stats">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">At a glance</h2>
          {syncing ? (
            <span className="font-mono text-[11px] text-[var(--warm)]">
              {sync.doneCount}/{sync.total}
              {sync.current ? ` · ${sync.current.label.toLowerCase()}` : " · syncing"}
            </span>
          ) : null}
        </div>
        {stats.busy ? (
          <>
            <SkeletonStatGrid count={4} />
            <SkeletonStatGrid count={4} className="mt-6" />
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Library"
                value={value?.librarySize ?? "—"}
                href="/library"
                delay={0}
              />
              <StatCard
                label="Playtime"
                value={value ? `${value.totalPlaytimeHours}h` : "—"}
                href="/library"
                delay={0.04}
              />
              <StatCard
                label="Unplayed"
                value={value?.unplayedCount ?? "—"}
                hint="Still waiting in the queue"
                href="/library"
                delay={0.08}
              />
              <StatCard
                label="Wishlist"
                value={value?.wishlistCount ?? "—"}
                href="/wishlist"
                delay={0.12}
              />
            </div>

            <section className="mt-6" aria-label="More stats">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Friends"
                  value={value?.activeFriends ?? "—"}
                  href="/friends"
                  delay={0.16}
                />
                <StatCard
                  label="Cost / hour"
                  value={
                    value?.costPerHour != null
                      ? formatMoney(value.costPerHour, value.currency || "USD")
                      : "—"
                  }
                  hint={
                    value?.lifetimeAtCurrent
                      ? `Library ~${formatMoney(value.lifetimeAtCurrent, value.currency || "USD")}`
                      : "See Cost for library value"
                  }
                  href="/cost"
                  delay={0.2}
                />
                <StatCard
                  label="Near completion"
                  value={value?.nearCompletionCount ?? 0}
                  hint="≥80% achievements (sampled)"
                  delay={0.24}
                />
                <StatCard
                  label="Deal signals"
                  value={value?.currentSalesCount ?? 0}
                  href="/wishlist"
                  delay={0.28}
                />
              </div>
            </section>
          </>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Play next
            </h2>
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
        {playNext.empty ? (
          <SkeletonTileGrid count={4} />
        ) : nextUp.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nextUp.slice(0, 8).map((g, i) => (
              <Link
                key={g.appId}
                href={`/library/${g.appId}`}
                className="block h-full"
              >
                <GameTile
                  name={g.name}
                  headerImage={g.headerImage}
                  meta={g.reasons.slice(0, 2).join(" · ") || `${Math.round(g.playtimeForever / 60)}h`}
                  index={i}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              syncing
                ? "Library sync is still running — play-next picks will show up shortly."
                : isSteamLinked
                  ? "Sync your library to get weekly play-next picks."
                  : "Link Steam from Connections to sync your library."
            }
            description={
                !isSteamLinked ? (
                <Link
                  href="/settings/connections"
                  className="text-[var(--accent)] hover:underline"
                >
                  Open Connections
                </Link>
              ) : undefined
            }
          />
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Recently played
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pick up where you left off
            </p>
          </div>
          <Link
            href="/library"
            className="shrink-0 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
          >
            Full library →
          </Link>
        </div>

        {stats.empty ? (
          <SkeletonTileGrid count={4} />
        ) : recentlyPlayed.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyPlayed.map((g, i) => (
              <Link
                key={g.appId}
                href={`/library/${g.appId}`}
                className="block h-full"
              >
                <GameTile
                  name={g.name}
                  headerImage={g.headerImage}
                  meta={`${Math.round(g.playtimeForever / 60)}h played`}
                  index={i}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              syncing
                ? "Still pulling recent play sessions from Steam…"
                : isSteamLinked
                  ? "No recent play sessions yet."
                  : "Link Steam from Connections to sync your library."
            }
            description={
              <Link
                href={isSteamLinked ? "/library" : "/settings/connections"}
                className="text-[var(--accent)] hover:underline"
              >
                {isSteamLinked ? "Open library" : "Open Connections"}
              </Link>
            }
          />
        )}
      </section>
    </>
  );
};