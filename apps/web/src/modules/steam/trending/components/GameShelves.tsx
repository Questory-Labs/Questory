"use client";

import { EmptyState } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { TrendingGame } from "@questorylabs/shared";
import type { ReactNode } from "react";
import type { ChartShelf, FriendsShelf, GlobalShelf } from "../steam.trending.types";
import {
  formatHours,
  formatPeak,
  formatPlayers,
  friendAvatars,
  gameBadges,
  withRankChange,
} from "../steam.trending.utils";
import { GameShelf } from "./GameShelf";
import { TrendingTile } from "./TrendingTile";

const shelfError = (title: string) => (
  <EmptyState title={<span className="text-danger">{title}</span>} />
);

const emptyWhen = (value: { games?: TrendingGame[] } | undefined, title: string) =>
  value && !value.games?.length ? <EmptyState title={title} /> : undefined;

const friendsMeta = (friends: UseResourceResult<FriendsShelf>) => {
  const v = friends.value;
  if (!v) return friends.empty ? "sampling friends…" : undefined;
  return `${v.meta.friendsWithData}/${v.meta.friendsSampled} friends with recent play${
    v.meta.truncated ? ` · sampled ${v.meta.friendsSampled}/${v.meta.friendsTotal}` : ""
  }${v.meta.cached ? " · cached" : ""}${friends.refreshing && v.meta.cached ? " · refreshing" : ""}`;
};

const friendLine = (g: TrendingGame) =>
  `${g.friendCount} friend${(g.friendCount || 0) === 1 ? "" : "s"} · ${formatHours(
    g.totalPlaytimeMinutes || 0,
  )} combined`;

const concurrentLine = (g: TrendingGame) =>
  g.concurrentPlayers != null
    ? `${formatPlayers(g.concurrentPlayers)} in-game`
    : g.peakPlayers != null
      ? formatPeak(g.peakPlayers)
      : undefined;

const peakLine = (g: TrendingGame) =>
  g.peakPlayers != null ? formatPeak(g.peakPlayers) : undefined;

const noLine = () => undefined;

const tiles = (
  games: TrendingGame[] | undefined,
  onSelect: (appId: number) => void,
  meta: (g: TrendingGame) => string | undefined,
  footer?: (g: TrendingGame) => ReactNode,
) =>
  (games ?? []).map((g, i) => (
    <TrendingTile
      key={g.appId}
      name={g.name}
      imageUrl={g.headerImage}
      rank={g.rank ?? i + 1}
      index={i}
      meta={withRankChange(g, meta(g))}
      badges={gameBadges(g)}
      footer={footer?.(g)}
      onClick={() => onSelect(g.appId)}
    />
  ));

export const GameShelves = ({
  friends,
  global,
  concurrent,
  deck,
  topReleases,
  onSelect,
}: {
  friends: UseResourceResult<FriendsShelf>;
  global: UseResourceResult<GlobalShelf>;
  concurrent: UseResourceResult<ChartShelf>;
  deck: UseResourceResult<ChartShelf>;
  topReleases: UseResourceResult<ChartShelf>;
  onSelect: (appId: number) => void;
}) => (
  <>
    <GameShelf
      title="Among friends"
      description="Most played by your friends, last two weeks"
      meta={friendsMeta(friends)}
      failed={friends.failed}
      empty={friends.empty}
      error={shelfError(
        "Could not load friend trending. Steam may be rate-limiting — try again shortly.",
      )}
      emptyContent={emptyWhen(
        friends.value,
        "No recent friend playtime yet. Make sure your friends list is public and Steam is linked.",
      )}
    >
      {tiles(friends.value?.games, onSelect, friendLine, friendAvatars)}
    </GameShelf>

    <GameShelf
      title="Playing now"
      live
      description="Live concurrent players across Steam"
      meta={
        concurrent.value?.meta.lastUpdate
          ? `updated ${new Date(concurrent.value.meta.lastUpdate).toLocaleTimeString()}`
          : undefined
      }
      failed={concurrent.failed}
      empty={concurrent.empty}
      error={shelfError("Could not load concurrent charts.")}
      emptyContent={emptyWhen(concurrent.value, "Concurrent chart unavailable right now.")}
    >
      {tiles(concurrent.value?.games, onSelect, concurrentLine)}
    </GameShelf>

    <GameShelf
      title="Global most played"
      description="Steam Charts weekly rollup"
      meta={
        global.value?.meta.rollupDate
          ? `week of ${new Date(global.value.meta.rollupDate).toLocaleDateString()}`
          : undefined
      }
      failed={global.failed}
      empty={global.empty}
      error={shelfError("Could not load Steam Charts.")}
      emptyContent={emptyWhen(global.value, "Steam Charts unavailable right now.")}
    >
      {tiles(global.value?.games, onSelect, peakLine)}
    </GameShelf>

    <GameShelf
      title="Steam Deck most played"
      description="What Deck players are jumping into"
      failed={deck.failed}
      empty={deck.empty}
      error={shelfError("Could not load Deck charts.")}
      emptyContent={emptyWhen(deck.value, "Deck chart unavailable right now.")}
    >
      {tiles(deck.value?.games, onSelect, noLine)}
    </GameShelf>

    <GameShelf
      title="Top releases"
      description={topReleases.value?.meta.pageName || "Steam Charts curated new-release standouts"}
      failed={topReleases.failed}
      empty={topReleases.empty}
      error={shelfError("Could not load top releases.")}
      emptyContent={emptyWhen(topReleases.value, "Top releases unavailable right now.")}
    >
      {tiles(topReleases.value?.games, onSelect, noLine)}
    </GameShelf>
  </>
);
