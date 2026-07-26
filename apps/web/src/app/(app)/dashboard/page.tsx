"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { GameTile } from "@/components/GameTile";
import { EmptyState, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useSyncJobs } from "@/hooks/useSyncJobs";
import type { DashboardStats, PlayNextItem } from "@questorylabs/shared";

type MeResponse = {
  user: {
    personaName: string;
    steamId: string | null;
  } | null;
};

export default function DashboardPage() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
  });
  const steamConnected = Boolean(me.data?.user?.steamId);
  const sync = useSyncJobs({ enabled: steamConnected });

  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardStats>("/dashboard/stats"),
    refetchInterval: () => (sync.active ? 2500 : false),
  });

  const playNext = useQuery({
    queryKey: ["play-next"],
    queryFn: () => api<PlayNextItem[]>("/dashboard/play-next"),
  });

  const d = stats.data;
  const syncing = sync.active;
  const name = me.data?.user?.personaName;
  const recent = d?.recentlyPlayed || [];
  const nextUp = playNext.data || [];

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Library"
            value={d?.librarySize ?? "—"}
            href="/library"
            delay={0}
          />
          <StatCard
            label="Playtime"
            value={d ? `${d.totalPlaytimeHours}h` : "—"}
            href="/library"
            delay={0.04}
          />
          <StatCard
            label="Unplayed"
            value={d?.unplayedCount ?? "—"}
            hint="Still waiting in the queue"
            href="/library"
            delay={0.08}
          />
          <StatCard
            label="Wishlist"
            value={d?.wishlistCount ?? "—"}
            href="/wishlist"
            delay={0.12}
          />
        </div>
      </section>

      <section className="mt-6" aria-label="More stats">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Friends"
            value={d?.activeFriends ?? "—"}
            href="/friends"
            delay={0.16}
          />
          <StatCard
            label="Cost / hour"
            value={
              d?.costPerHour != null
                ? formatMoney(d.costPerHour, d.currency || "USD")
                : "—"
            }
            hint={
              d?.lifetimeAtCurrent
                ? `Library ~${formatMoney(d.lifetimeAtCurrent, d.currency || "USD")}`
                : "See Cost for library value"
            }
            href="/cost"
            delay={0.2}
          />
          <StatCard
            label="Near completion"
            value={d?.nearCompletionCount ?? 0}
            hint="≥80% achievements (sampled)"
            delay={0.24}
          />
          <StatCard
            label="Deal signals"
            value={d?.currentSalesCount ?? 0}
            href="/wishlist"
            delay={0.28}
          />
        </div>
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
        {nextUp.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nextUp.slice(0, 8).map((g, i) => (
              <Link key={g.appId} href={`/library/${g.appId}`}>
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
                : steamConnected
                  ? "Sync your library to get weekly play-next picks."
                  : "Link Steam from Connections to sync your library."
            }
            description={
              !steamConnected ? (
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

        {stats.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[460/215] border border-[var(--line)] bg-[var(--bg-1)] hatch-fill"
              />
            ))}
          </div>
        ) : recent.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((g, i) => (
              <Link key={g.appId} href={`/library/${g.appId}`}>
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
                : steamConnected
                  ? "No recent play sessions yet."
                  : "Link Steam from Connections to sync your library."
            }
            description={
              <Link
                href={steamConnected ? "/library" : "/settings/connections"}
                className="text-[var(--accent)] hover:underline"
              >
                {steamConnected ? "Open library" : "Open Connections"}
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
