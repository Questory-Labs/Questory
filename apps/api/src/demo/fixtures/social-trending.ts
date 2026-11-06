import type {
  TrendingGame,
  TrendingResponse,
  TrendingShelf,
} from "@questorylabs/shared";
import { CHART_TOP_N, GLOBAL_TOP_N, SAMPLE_FRIENDS } from "../../trending/trending.constants";
import { DEMO_FRIENDS, daysAgo } from "./helpers";
import {
  FRIEND_RECENT_MINUTES,
  SOCIAL_GAMES,
  gameRef,
  requireGame,
  viewerOwns,
  type SocialGame,
} from "./social-data";

const RECENT_WINDOW_DAYS = 14;
const GLOBAL_RANK_CHANGES = [0, 1, -1, 2, 0, -2, 3, 1, -1, 0, 2, -3, 1, 0, -1, 2];
const DECK_ORDER = [1086940, 413150, 1145360, 1091500, 105600, 367520, 646570, 548430];
const DECK_RANK_CHANGES = [0, 2, -1, 1, 0, -2, 3, 0];
const TOP_RELEASE_ORDER = [1086940, 1245620, 892970, 1426210, 1091500, 427520];

function row(game: SocialGame, extra: Partial<TrendingGame>): TrendingGame {
  return {
    ...gameRef(game),
    ...extra,
    deckStatus: game.deckStatus,
    owned: viewerOwns(game.appId),
  };
}

function ranked(
  order: (game: SocialGame) => number,
  limit: number,
): SocialGame[] {
  return [...SOCIAL_GAMES].sort((a, b) => order(b) - order(a)).slice(0, limit);
}

export function friendsShelf(): TrendingResponse["friends"] {
  const totals = new Map<
    number,
    { friendCount: number; minutes: number; samples: typeof DEMO_FRIENDS[number][] }
  >();
  for (const friend of DEMO_FRIENDS) {
    for (const [appId, minutes] of FRIEND_RECENT_MINUTES.get(friend.steamId) ?? []) {
      const entry = totals.get(appId) ?? { friendCount: 0, minutes: 0, samples: [] };
      entry.friendCount += 1;
      entry.minutes += minutes;
      if (entry.samples.length < SAMPLE_FRIENDS) entry.samples.push(friend);
      totals.set(appId, entry);
    }
  }
  const games = [...totals.entries()]
    .sort(
      ([, a], [, b]) => b.friendCount - a.friendCount || b.minutes - a.minutes,
    )
    .map(([appId, entry]) =>
      row(requireGame(appId), {
        friendCount: entry.friendCount,
        totalPlaytimeMinutes: entry.minutes,
        sampleFriends: entry.samples.map((friend) => ({
          steamId: friend.steamId,
          personaName: friend.personaName,
          avatarUrl: null,
        })),
      }),
    );
  return {
    games,
    meta: {
      friendsTotal: DEMO_FRIENDS.length,
      friendsSampled: DEMO_FRIENDS.length,
      friendsWithData: DEMO_FRIENDS.length,
      friendsFailed: 0,
      cached: true,
      truncated: false,
      windowDays: RECENT_WINDOW_DAYS,
    },
  } satisfies TrendingResponse["friends"];
}

export function globalShelf(): TrendingResponse["global"] {
  const games = ranked((game) => game.online.peak24h, GLOBAL_TOP_N).map(
    (game, index) =>
      row(game, {
        rank: index + 1,
        peakPlayers: game.online.peak24h,
        rankChange: GLOBAL_RANK_CHANGES[index] ?? null,
      }),
  );
  return {
    games,
    meta: { rollupDate: daysAgo(3), source: "steam_charts" },
  } satisfies TrendingResponse["global"];
}

export function concurrentShelf(): TrendingShelf {
  const games = ranked((game) => game.online.current, CHART_TOP_N).map(
    (game, index) =>
      row(game, {
        rank: index + 1,
        peakPlayers: game.online.peak24h,
        concurrentPlayers: game.online.current,
        rankChange: null,
      }),
  );
  return {
    games,
    meta: { lastUpdate: daysAgo(0.004), source: "steam_charts_concurrent" },
  } satisfies TrendingShelf;
}

export function deckShelf(): TrendingShelf {
  const games = DECK_ORDER.map((appId, index) =>
    row(requireGame(appId), {
      rank: index + 1,
      rankChange: DECK_RANK_CHANGES[index] ?? null,
    }),
  );
  return {
    games,
    meta: { period: 1, source: "steam_charts_deck" },
  } satisfies TrendingShelf;
}

export function topReleasesShelf(): TrendingShelf {
  const start = new Date(daysAgo(30));
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const month = start.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const games = TOP_RELEASE_ORDER.map((appId, index) =>
    row(requireGame(appId), { rank: index + 1, rankChange: null }),
  );
  return {
    games,
    meta: {
      pageName: `Top Releases of ${month}`,
      rollupDate: start.toISOString(),
      source: "steam_charts_top_releases",
    },
  } satisfies TrendingShelf;
}

export function trendingAll(): TrendingResponse {
  return {
    friends: friendsShelf(),
    global: globalShelf(),
    concurrent: concurrentShelf(),
    deck: deckShelf(),
    topReleases: topReleasesShelf(),
  } satisfies TrendingResponse;
}
