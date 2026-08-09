"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { GameShelf, GameShelfItem } from "@/components/GameShelf";
import { GameTile } from "@/components/GameTile";
import { EmptyState, PageHeader } from "@/components/ui";
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
  const friends = useResource({
    id: ["trending", "friends"],
    load: () => api<FriendsShelf>("/trending/friends"),
    freshFor: 60_000,
  });

  const global = useResource({
    id: ["trending", "global"],
    load: () => api<GlobalShelf>("/trending/global"),
    freshFor: 60_000,
  });

  const concurrent = useResource({
    id: ["trending", "concurrent"],
    load: () => api<ChartShelf>("/trending/concurrent"),
    freshFor: 30_000,
  });

  const deck = useResource({
    id: ["trending", "deck"],
    load: () => api<ChartShelf>("/trending/deck"),
    freshFor: 60_000,
  });

  const topReleases = useResource({
    id: ["trending", "top-releases"],
    load: () => api<ChartShelf>("/trending/top-releases"),
    freshFor: 120_000,
  });

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

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
            eyebrow="What's hot"
            title="Trending"
            description="Friends activity, live concurrent charts, Steam Deck picks, and top new releases — pulled from Steam's chart APIs."
          />
        </motion.div>
      </section>

      <GameShelf
        title="Among friends"
        description="Most played by your friends over the last two weeks"
        loading={friends.empty}
        meta={
          friends.value
            ? `${friends.value.meta.friendsWithData}/${friends.value.meta.friendsSampled} friends with recent play${
                friends.value.meta.truncated
                  ? ` · sampled ${friends.value.meta.friendsSampled}/${friends.value.meta.friendsTotal}`
                  : ""
              }${friends.value.meta.cached ? " · cached" : ""}${
                friends.refreshing && friends.value.meta.cached
                  ? " · refreshing"
                  : ""
              }`
            : friends.empty
              ? "sampling friends…"
              : undefined
        }
        empty={
          friends.failed ? (
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load friend trending. Steam may be rate-limiting —
                  try again shortly.
                </span>
              }
            />
          ) : !friends.empty &&
            friends.value &&
            !friends.value.games.length ? (
            <EmptyState title="No recent friend playtime yet. Make sure your friends list is public and Steam is linked." />
          ) : undefined
        }
      >
        {(friends.value?.games || []).map((g, i) => (
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
        loading={concurrent.empty}
        meta={
          concurrent.value?.meta.lastUpdate
            ? `updated ${new Date(concurrent.value.meta.lastUpdate).toLocaleTimeString()}`
            : undefined
        }
        empty={
          concurrent.failed ? (
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load concurrent charts.
                </span>
              }
            />
          ) : !concurrent.empty &&
            concurrent.value &&
            !concurrent.value.games.length ? (
            <EmptyState title="Concurrent chart unavailable right now." />
          ) : undefined
        }
      >
        {(concurrent.value?.games || []).map((g, i) => (
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
        loading={global.empty}
        meta={
          global.value?.meta.rollupDate
            ? `week of ${new Date(global.value.meta.rollupDate).toLocaleDateString()}`
            : undefined
        }
        empty={
          global.failed ? (
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load Steam Charts.
                </span>
              }
            />
          ) : !global.empty &&
            global.value &&
            !global.value.games.length ? (
            <EmptyState title="Steam Charts unavailable right now." />
          ) : undefined
        }
      >
        {(global.value?.games || []).map((g, i) => (
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
        loading={deck.empty}
        empty={
          deck.failed ? (
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load Deck charts.
                </span>
              }
            />
          ) : !deck.empty && deck.value && !deck.value.games.length ? (
            <EmptyState title="Deck chart unavailable right now." />
          ) : undefined
        }
      >
        {(deck.value?.games || []).map((g, i) => (
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
          topReleases.value?.meta.pageName ||
          "Steam Charts curated new-release standouts"
        }
        loading={topReleases.empty}
        empty={
          topReleases.failed ? (
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load top releases.
                </span>
              }
            />
          ) : !topReleases.empty &&
            topReleases.value &&
            !topReleases.value.games.length ? (
            <EmptyState title="Top releases unavailable right now." />
          ) : undefined
        }
      >
        {(topReleases.value?.games || []).map((g, i) => (
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
    </>
  );
}
