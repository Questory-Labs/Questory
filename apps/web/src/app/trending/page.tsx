"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { GameShelf, GameShelfItem } from "@/components/GameShelf";
import { GameTile } from "@/components/GameTile";
import { HatchShadow } from "@/components/HatchShadow";
import { api } from "@/lib/api";
import type { TrendingGame, TrendingResponse } from "@questorylabs/shared";

type FriendsShelf = TrendingResponse["friends"];
type GlobalShelf = TrendingResponse["global"];
type ChartShelf = NonNullable<TrendingResponse["concurrent"]>;

function formatPeak(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M peak`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k peak`;
  return `${n} peak`;
}

function formatPlayers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatHours(minutes: number) {
  const h = minutes / 60;
  if (h >= 100) return `${Math.round(h)}h`;
  if (h >= 10) return `${h.toFixed(0)}h`;
  return `${h.toFixed(1)}h`;
}

function rankBadge(game: TrendingGame) {
  if (game.rank == null) return null;
  const change = game.rankChange;
  let changeLabel = "";
  if (change != null && change !== 0) {
    changeLabel = change > 0 ? ` ↑${change}` : ` ↓${Math.abs(change)}`;
  }
  return (
    <span className="rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-white">
      #{game.rank}
      {changeLabel}
    </span>
  );
}

function friendAvatars(game: TrendingGame) {
  const samples = game.sampleFriends || [];
  if (!samples.length) return null;
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {samples.map((f) =>
          f.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.steamId}
              src={f.avatarUrl}
              alt=""
              title={f.personaName}
              className="h-5 w-5 rounded-full border border-black/40"
            />
          ) : (
            <span
              key={f.steamId}
              title={f.personaName}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/40 bg-[var(--bg-2)] text-[8px] text-white"
            >
              {f.personaName.slice(0, 1)}
            </span>
          ),
        )}
      </div>
      <span className="text-[10px] text-white/90">
        {game.friendCount} friend{(game.friendCount || 0) === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function TrendingPage() {
  const friends = useQuery({
    queryKey: ["trending", "friends"],
    queryFn: () => api<FriendsShelf>("/trending/friends"),
    staleTime: 60_000,
  });

  const global = useQuery({
    queryKey: ["trending", "global"],
    queryFn: () => api<GlobalShelf>("/trending/global"),
    staleTime: 60_000,
  });

  const concurrent = useQuery({
    queryKey: ["trending", "concurrent"],
    queryFn: () => api<ChartShelf>("/trending/concurrent"),
    staleTime: 30_000,
  });

  const deck = useQuery({
    queryKey: ["trending", "deck"],
    queryFn: () => api<ChartShelf>("/trending/deck"),
    staleTime: 60_000,
  });

  const topReleases = useQuery({
    queryKey: ["trending", "top-releases"],
    queryFn: () => api<ChartShelf>("/trending/top-releases"),
    staleTime: 120_000,
  });

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  return (
    <AppShell>
      <section className="relative mb-10 overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 opacity-60 gen-orb"
          aria-hidden
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            What&apos;s hot
          </p>
          <h1
            className="font-display mt-2 max-w-2xl text-4xl tracking-tight sm:text-5xl"
            style={{ fontWeight: 700 }}
          >
            Trending
          </h1>
          <p className="mt-3 max-w-lg text-[var(--muted)]">
            Friends activity, live concurrent charts, Steam Deck picks, and top
            new releases — pulled from Steam&apos;s chart APIs.
          </p>
        </motion.div>
      </section>

      <GameShelf
        title="Among friends"
        description="Most played by your friends over the last two weeks"
        loading={friends.isLoading}
        meta={
          friends.data
            ? `${friends.data.meta.friendsWithData}/${friends.data.meta.friendsSampled} friends with recent play${
                friends.data.meta.truncated
                  ? ` · sampled ${friends.data.meta.friendsSampled}/${friends.data.meta.friendsTotal}`
                  : ""
              }${friends.data.meta.cached ? " · cached" : ""}${
                friends.isFetching && friends.data.meta.cached
                  ? " · refreshing"
                  : ""
              }`
            : friends.isLoading
              ? "sampling friends…"
              : undefined
        }
        empty={
          friends.isError ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--danger)]">
                Could not load friend trending. Steam may be rate-limiting —
                try again shortly.
              </p>
            </HatchShadow>
          ) : !friends.isLoading &&
            friends.data &&
            !friends.data.games.length ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                No recent friend playtime yet. Make sure your friends list is
                public, sync friends from the sidebar, then refresh.
              </p>
            </HatchShadow>
          ) : undefined
        }
      >
        {(friends.data?.games || []).map((g, i) => (
          <GameShelfItem key={g.appId}>
            <GameTile
              name={g.name}
              headerImage={g.headerImage}
              index={i}
              onClick={() => setSelectedAppId(g.appId)}
              meta={`${g.friendCount} friend${
                (g.friendCount || 0) === 1 ? "" : "s"
              } · ${formatHours(g.totalPlaytimeMinutes || 0)} combined`}
              badge={friendAvatars(g)}
            />
          </GameShelfItem>
        ))}
      </GameShelf>

      <GameShelf
        title="Playing now"
        description="Live concurrent players across Steam"
        loading={concurrent.isLoading}
        meta={
          concurrent.data?.meta.lastUpdate
            ? `updated ${new Date(concurrent.data.meta.lastUpdate).toLocaleTimeString()}`
            : undefined
        }
        empty={
          concurrent.isError ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--danger)]">
                Could not load concurrent charts.
              </p>
            </HatchShadow>
          ) : !concurrent.isLoading &&
            concurrent.data &&
            !concurrent.data.games.length ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                Concurrent chart unavailable right now.
              </p>
            </HatchShadow>
          ) : undefined
        }
      >
        {(concurrent.data?.games || []).map((g, i) => (
          <GameShelfItem key={g.appId}>
            <GameTile
              name={g.name}
              headerImage={g.headerImage}
              index={i}
              onClick={() => setSelectedAppId(g.appId)}
              meta={
                g.concurrentPlayers != null
                  ? `${formatPlayers(g.concurrentPlayers)} in-game`
                  : g.peakPlayers != null
                    ? formatPeak(g.peakPlayers)
                    : undefined
              }
              corner={rankBadge(g)}
            />
          </GameShelfItem>
        ))}
      </GameShelf>

      <GameShelf
        title="Global most played"
        description="Steam Charts weekly rollup — same source as the store charts page"
        loading={global.isLoading}
        meta={
          global.data?.meta.rollupDate
            ? `week of ${new Date(global.data.meta.rollupDate).toLocaleDateString()}`
            : undefined
        }
        empty={
          global.isError ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--danger)]">
                Could not load Steam Charts.
              </p>
            </HatchShadow>
          ) : !global.isLoading &&
            global.data &&
            !global.data.games.length ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                Steam Charts unavailable right now.
              </p>
            </HatchShadow>
          ) : undefined
        }
      >
        {(global.data?.games || []).map((g, i) => (
          <GameShelfItem key={g.appId}>
            <GameTile
              name={g.name}
              headerImage={g.headerImage}
              index={i}
              onClick={() => setSelectedAppId(g.appId)}
              meta={
                g.peakPlayers != null ? formatPeak(g.peakPlayers) : undefined
              }
              corner={rankBadge(g)}
            />
          </GameShelfItem>
        ))}
      </GameShelf>

      <GameShelf
        title="Steam Deck most played"
        description="What Deck players are jumping into"
        loading={deck.isLoading}
        empty={
          deck.isError ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--danger)]">
                Could not load Deck charts.
              </p>
            </HatchShadow>
          ) : !deck.isLoading && deck.data && !deck.data.games.length ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                Deck chart unavailable right now.
              </p>
            </HatchShadow>
          ) : undefined
        }
      >
        {(deck.data?.games || []).map((g, i) => (
          <GameShelfItem key={g.appId}>
            <GameTile
              name={g.name}
              headerImage={g.headerImage}
              index={i}
              onClick={() => setSelectedAppId(g.appId)}
              corner={rankBadge(g)}
            />
          </GameShelfItem>
        ))}
      </GameShelf>

      <GameShelf
        title="Top releases"
        description={
          topReleases.data?.meta.pageName ||
          "Steam Charts curated new-release standouts"
        }
        loading={topReleases.isLoading}
        empty={
          topReleases.isError ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--danger)]">
                Could not load top releases.
              </p>
            </HatchShadow>
          ) : !topReleases.isLoading &&
            topReleases.data &&
            !topReleases.data.games.length ? (
            <HatchShadow faceClassName="panel px-5 py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                Top releases unavailable right now.
              </p>
            </HatchShadow>
          ) : undefined
        }
      >
        {(topReleases.data?.games || []).map((g, i) => (
          <GameShelfItem key={g.appId}>
            <GameTile
              name={g.name}
              headerImage={g.headerImage}
              index={i}
              onClick={() => setSelectedAppId(g.appId)}
              corner={rankBadge(g)}
            />
          </GameShelfItem>
        ))}
      </GameShelf>

      <FamilyGameSidebar
        appId={selectedAppId}
        variant="friends"
        onClose={() => setSelectedAppId(null)}
      />
    </AppShell>
  );
}
