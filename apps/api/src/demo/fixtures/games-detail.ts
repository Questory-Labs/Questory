import type { GameDetail } from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import {
  DEMO_CURRENCY,
  findDemoGame,
  isOwned,
  metaFor,
  currentPrice,
  ownedProfile,
  roundHours,
} from "./games-catalog";
import { generateSessions } from "./games-sessions";
import { DEMO_FRIENDS, daysAgo, steamHeaderUrl } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_WINDOW_DAYS = 90;
const PRICE_POINTS = 8;
const PRICE_STEP_DAYS = 45;
const PLAYER_POINTS = 14;
const HISTOGRAM_POINTS = 6;
const HISTOGRAM_STEP_DAYS = 30;
const ACHIEVEMENT_SAMPLE = 6;

type DemoGame = ReturnType<typeof findDemoGame>;

const ACHIEVEMENT_NAMES = [
  { name: "FIRST_STEPS", displayName: "First Steps", description: "Finish the opening stretch" },
  { name: "GETTING_THE_HANG", displayName: "Getting the Hang of It", description: "Reach the first major milestone" },
  { name: "EXPLORER", displayName: "Explorer", description: "Discover every main area" },
  { name: "COLLECTOR", displayName: "Collector", description: "Gather a full set of items" },
  { name: "VETERAN", displayName: "Veteran", description: "Beat the main challenge" },
  { name: "COMPLETIONIST", displayName: "Completionist", description: "Clear every remaining objective" },
];

function priceHistory(appId: number) {
  const meta = metaFor(appId);
  const now = currentPrice(appId);
  return Array.from({ length: PRICE_POINTS }, (_, index) => {
    const onSale = index % 3 === 1;
    const isLatest = index === PRICE_POINTS - 1;
    return {
      date: daysAgo((PRICE_POINTS - 1 - index) * PRICE_STEP_DAYS),
      price: isLatest ? now : onSale ? meta.lowest : meta.price,
    };
  });
}

function onlinePlayers(appId: number) {
  const base = Math.round(metaFor(appId).reviewsPositive / 40);
  const history = Array.from({ length: PLAYER_POINTS }, (_, index) => ({
    date: daysAgo(PLAYER_POINTS - 1 - index),
    players: Math.round(base * (0.8 + ((index * 3) % 7) / 20)),
  }));
  return {
    current: history[PLAYER_POINTS - 1].players,
    peak24h: Math.round(base * 1.15),
    peakAllTime: base * 4,
    history,
  };
}

function reviewHistogram(appId: number) {
  const meta = metaFor(appId);
  const positiveShare = meta.reviewsPositive / (meta.reviewsPositive + meta.reviewsNegative);
  return Array.from({ length: HISTOGRAM_POINTS }, (_, index) => {
    const volume = 800 + ((index * 137) % 400);
    return {
      date: Math.floor(
        (Date.now() - (HISTOGRAM_POINTS - 1 - index) * HISTOGRAM_STEP_DAYS * DAY_MS) / 1000,
      ),
      recommendationsUp: Math.round(volume * positiveShare),
      recommendationsDown: Math.round(volume * (1 - positiveShare)),
    };
  });
}

function achievements(game: DemoGame) {
  const meta = metaFor(game.appId);
  const owned = isOwned(game.appId);
  const unlocked = owned ? ownedProfile(game.appId).unlocked : 0;
  const unlockedShare = meta.achievementTotal > 0 ? unlocked / meta.achievementTotal : 0;
  return {
    unlocked,
    total: meta.achievementTotal,
    pct: Math.round(unlockedShare * 100),
    global: ACHIEVEMENT_NAMES.slice(0, ACHIEVEMENT_SAMPLE).map((item, index) => {
      const isUnlocked = index < Math.round(unlockedShare * ACHIEVEMENT_SAMPLE);
      return {
        ...item,
        percent: Math.round(82 / (index + 1)),
        icon: null,
        unlocked: isUnlocked,
        unlockTime: isUnlocked ? daysAgo(20 + index * 15) : null,
      };
    }),
  };
}

function sessions90d(game: DemoGame) {
  const now = Date.now();
  const rows = generateSessions(now).filter((session) => session.appId === game.appId);
  const days = Array.from({ length: SESSION_WINDOW_DAYS }, (_, index) => {
    const date = new Date(now - (SESSION_WINDOW_DAYS - 1 - index) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const secs = rows
      .filter((session) => session.dayKey === date)
      .reduce((sum, session) => sum + session.durationSecs, 0);
    return { date, minutes: Math.round(secs / 60) };
  });
  const totalSecs = rows.reduce((sum, session) => sum + session.durationSecs, 0);
  return {
    days,
    count: rows.length,
    avgMinutes: rows.length > 0 ? Math.round(totalSecs / 60 / rows.length) : 0,
  };
}

function friendOwners(game: DemoGame) {
  const count = (game.appId % DEMO_FRIENDS.length) + 1;
  return DEMO_FRIENDS.slice(0, count).map((friend, index) => {
    const playtimeForever = Math.round(game.minutes / (index + 2)) + 120 * (index + 1);
    return {
      steamId: friend.steamId,
      personaName: friend.personaName,
      avatarUrl: null,
      playtimeForever,
      playtimeHours: roundHours(playtimeForever),
    };
  });
}

export function gameDetail(idOrAppId: string): GameDetail {
  const game = findDemoGame(idOrAppId);
  const meta = metaFor(game.appId);
  const owned = isOwned(game.appId);
  return {
    appId: game.appId,
    name: game.name,
    headerImage: steamHeaderUrl(game.appId),
    genres: [...game.genres],
    categories: meta.categories,
    tags: [...game.genres],
    developers: [meta.developer],
    publishers: [meta.publisher],
    deckStatus: meta.deckStatus,
    releaseDate: meta.releaseDate,
    isFree: false,
    minPlayers: 1,
    maxPlayers: meta.maxPlayers,
    playerMaxes: [meta.maxPlayers],
    playerCountSource: "steam_tag",
    onlinePlayers: onlinePlayers(game.appId),
    youOwn: owned,
    yourPlaytimeHours: owned ? roundHours(game.minutes) : null,
    friendOwners: friendOwners(game),
    price: {
      current: currentPrice(game.appId),
      lowest: meta.lowest,
      historicalLow: meta.lowest,
      historicalHigh: meta.price,
      currency: DEMO_CURRENCY,
      history: priceHistory(game.appId),
    },
    review: {
      score: meta.reviewScore,
      description: meta.reviewDescription,
      totalPositive: meta.reviewsPositive,
      totalNegative: meta.reviewsNegative,
      totalReviews: meta.reviewsPositive + meta.reviewsNegative,
      storedScore: meta.reviewScore,
      histogram: reviewHistogram(game.appId),
    },
    hltb: {
      mainHours: meta.mainHours,
      extraHours: meta.extraHours,
      completionistHours: meta.completionistHours,
      sourceUrl: null,
    },
    news: [],
    achievements: achievements(game),
    platforms: ["windows"],
    metacriticScore: null,
    userStatus: owned ? ownedProfile(game.appId).status : null,
    sessions90d: owned ? sessions90d(game) : null,
    dlc: [],
    packages: [],
  };
}

export const gameDetailRoutes: DemoRoute[] = [
  {
    method: "GET",
    pattern: "/games/:appId",
    respond: ({ params }) => gameDetail(params.appId),
  },
];
