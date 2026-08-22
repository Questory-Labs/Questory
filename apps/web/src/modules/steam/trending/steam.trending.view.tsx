"use client";

import { GameShelf, GameShelfItem } from "@/modules/steam/trending/components/GameShelf";
import { GameTile } from "@/components/GameTile";
import { EmptyState, PageHeader } from "@questorylabs/ui";
import { motion } from "framer-motion";
import { formatHours, formatPeak, formatPlayers, friendAvatars, rankBadge } from "./steam.trending.utils";
import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import type { TrendingViewProps } from "./steam.trending.types";

const shelfError = (title: string) => (
  <EmptyState
    title={<span className="text-[var(--danger)]">{title}</span>}
  />
);

export const TrendingView = (props: Record<string, unknown>) => {
  const { friends, global, concurrent, deck, topReleases, selectedAppId, setSelectedAppId } = props as TrendingViewProps;

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
        failed={friends.failed}
        empty={friends.empty}
        error={shelfError(
          "Could not load friend trending. Steam may be rate-limiting — try again shortly.",
        )}
        emptyContent={
          friends.value && !friends.value.games.length ? (
            <EmptyState title="No recent friend playtime yet. Make sure your friends list is public and Steam is linked." />
          ) : undefined
        }
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
        failed={concurrent.failed}
        empty={concurrent.empty}
        error={shelfError("Could not load concurrent charts.")}
        emptyContent={
          concurrent.value && !concurrent.value.games.length ? (
            <EmptyState title="Concurrent chart unavailable right now." />
          ) : undefined
        }
        meta={
          concurrent.value?.meta.lastUpdate
            ? `updated ${new Date(concurrent.value.meta.lastUpdate).toLocaleTimeString()}`
            : undefined
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
        failed={global.failed}
        empty={global.empty}
        error={shelfError("Could not load Steam Charts.")}
        emptyContent={
          global.value && !global.value.games.length ? (
            <EmptyState title="Steam Charts unavailable right now." />
          ) : undefined
        }
        meta={
          global.value?.meta.rollupDate
            ? `week of ${new Date(global.value.meta.rollupDate).toLocaleDateString()}`
            : undefined
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
        failed={deck.failed}
        empty={deck.empty}
        error={shelfError("Could not load Deck charts.")}
        emptyContent={
          deck.value && !deck.value.games.length ? (
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
        failed={topReleases.failed}
        empty={topReleases.empty}
        error={shelfError("Could not load top releases.")}
        emptyContent={
          topReleases.value && !topReleases.value.games.length ? (
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
};
