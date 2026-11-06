import type { Game, LibraryEntry, LibraryUserStatus } from "@questorylabs/shared";
import { DEMO_GAMES, daysAgo, steamHeaderUrl } from "./helpers";

export const DEMO_CURRENCY = "USD";
const MAX_PAGE_SIZE = 100;

type DemoGameBase = (typeof DEMO_GAMES)[number];

type GameMeta = {
  developer: string;
  publisher: string;
  releaseDate: string;
  price: number;
  lowest: number;
  discount: number;
  reviewScore: number;
  reviewDescription: string;
  reviewsPositive: number;
  reviewsNegative: number;
  mainHours: number;
  extraHours: number;
  completionistHours: number;
  achievementTotal: number;
  deckStatus: "verified" | "playable";
  categories: string[];
  maxPlayers: number;
};

const SOLO = ["Single-player", "Steam Achievements", "Steam Cloud"];
const COOP = ["Single-player", "Online Co-op", "Steam Achievements", "Steam Cloud"];
const COUCH = ["Local Co-op", "Online Co-op", "Remote Play Together", "Steam Achievements"];

const META: Record<number, GameMeta> = {
  1145360: { developer: "Supergiant Games", publisher: "Supergiant Games", releaseDate: "2020-09-17", price: 24.99, lowest: 9.99, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 248000, reviewsNegative: 4100, mainHours: 23, extraHours: 49, completionistHours: 95, achievementTotal: 49, deckStatus: "verified", categories: SOLO, maxPlayers: 1 },
  413150: { developer: "ConcernedApe", publisher: "ConcernedApe", releaseDate: "2016-02-26", price: 14.99, lowest: 8.99, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 610000, reviewsNegative: 11000, mainHours: 53, extraHours: 95, completionistHours: 163, achievementTotal: 49, deckStatus: "verified", categories: COOP, maxPlayers: 8 },
  367520: { developer: "Team Cherry", publisher: "Team Cherry", releaseDate: "2017-02-24", price: 14.99, lowest: 7.49, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 340000, reviewsNegative: 11500, mainHours: 27, extraHours: 42, completionistHours: 65, achievementTotal: 63, deckStatus: "verified", categories: SOLO, maxPlayers: 1 },
  504230: { developer: "Maddy Makes Games", publisher: "Maddy Makes Games", releaseDate: "2018-01-25", price: 19.99, lowest: 4.99, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 92000, reviewsNegative: 2300, mainHours: 8, extraHours: 19, completionistHours: 38, achievementTotal: 32, deckStatus: "verified", categories: SOLO, maxPlayers: 1 },
  620: { developer: "Valve", publisher: "Valve", releaseDate: "2011-04-18", price: 9.99, lowest: 0.99, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 390000, reviewsNegative: 5200, mainHours: 8, extraHours: 13, completionistHours: 22, achievementTotal: 51, deckStatus: "verified", categories: COOP, maxPlayers: 2 },
  105600: { developer: "Re-Logic", publisher: "Re-Logic", releaseDate: "2011-05-16", price: 9.99, lowest: 4.99, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 1050000, reviewsNegative: 26000, mainHours: 52, extraHours: 104, completionistHours: 216, achievementTotal: 115, deckStatus: "verified", categories: COOP, maxPlayers: 8 },
  632470: { developer: "ZA/UM", publisher: "ZA/UM", releaseDate: "2019-10-15", price: 39.99, lowest: 9.99, discount: 60, reviewScore: 8, reviewDescription: "Very Positive", reviewsPositive: 88000, reviewsNegative: 7400, mainHours: 22, extraHours: 34, completionistHours: 45, achievementTotal: 45, deckStatus: "playable", categories: SOLO, maxPlayers: 1 },
  1086940: { developer: "Larian Studios", publisher: "Larian Studios", releaseDate: "2023-08-03", price: 59.99, lowest: 47.99, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 690000, reviewsNegative: 26000, mainHours: 75, extraHours: 118, completionistHours: 172, achievementTotal: 54, deckStatus: "verified", categories: COOP, maxPlayers: 4 },
  1245620: { developer: "FromSoftware", publisher: "Bandai Namco Entertainment", releaseDate: "2022-02-24", price: 59.99, lowest: 35.99, discount: 0, reviewScore: 8, reviewDescription: "Very Positive", reviewsPositive: 780000, reviewsNegative: 79000, mainHours: 59, extraHours: 103, completionistHours: 135, achievementTotal: 42, deckStatus: "verified", categories: COOP, maxPlayers: 4 },
  427520: { developer: "Wube Software", publisher: "Wube Software", releaseDate: "2020-08-14", price: 35, lowest: 35, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 200000, reviewsNegative: 3000, mainHours: 42, extraHours: 92, completionistHours: 247, achievementTotal: 39, deckStatus: "verified", categories: COOP, maxPlayers: 16 },
  1091500: { developer: "CD PROJEKT RED", publisher: "CD PROJEKT RED", releaseDate: "2020-12-09", price: 59.99, lowest: 19.99, discount: 50, reviewScore: 8, reviewDescription: "Very Positive", reviewsPositive: 730000, reviewsNegative: 120000, mainHours: 26, extraHours: 62, completionistHours: 106, achievementTotal: 57, deckStatus: "verified", categories: SOLO, maxPlayers: 1 },
  548430: { developer: "Ghost Ship Games", publisher: "Coffee Stain Publishing", releaseDate: "2020-05-13", price: 29.99, lowest: 7.49, discount: 0, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 230000, reviewsNegative: 6100, mainHours: 21, extraHours: 76, completionistHours: 230, achievementTotal: 76, deckStatus: "verified", categories: COOP, maxPlayers: 4 },
  892970: { developer: "Iron Gate AB", publisher: "Coffee Stain Publishing", releaseDate: "2021-02-02", price: 19.99, lowest: 13.99, discount: 25, reviewScore: 8, reviewDescription: "Very Positive", reviewsPositive: 340000, reviewsNegative: 20000, mainHours: 49, extraHours: 95, completionistHours: 146, achievementTotal: 40, deckStatus: "verified", categories: COOP, maxPlayers: 10 },
  646570: { developer: "Mega Crit", publisher: "Mega Crit", releaseDate: "2019-01-23", price: 24.99, lowest: 6.24, discount: 75, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 150000, reviewsNegative: 3100, mainHours: 12, extraHours: 62, completionistHours: 150, achievementTotal: 46, deckStatus: "verified", categories: SOLO, maxPlayers: 1 },
  1426210: { developer: "Hazelight", publisher: "Electronic Arts", releaseDate: "2021-03-26", price: 39.99, lowest: 9.99, discount: 60, reviewScore: 9, reviewDescription: "Overwhelmingly Positive", reviewsPositive: 240000, reviewsNegative: 11000, mainHours: 13, extraHours: 16, completionistHours: 20, achievementTotal: 20, deckStatus: "playable", categories: COUCH, maxPlayers: 2 },
  728880: { developer: "Ghost Town Games", publisher: "Team17", releaseDate: "2018-08-07", price: 24.99, lowest: 6.24, discount: 50, reviewScore: 8, reviewDescription: "Very Positive", reviewsPositive: 42000, reviewsNegative: 3600, mainHours: 12, extraHours: 21, completionistHours: 40, achievementTotal: 54, deckStatus: "playable", categories: COUCH, maxPlayers: 4 },
};

const WISHLIST_APP_IDS = new Set<number>([632470, 892970, 646570, 728880, 1426210]);

type OwnedProfile = {
  lastPlayedDays: number | null;
  purchasedDays: number;
  twoWeeks: number;
  paid: number;
  unlocked: number;
  status: LibraryUserStatus | null;
};

const OWNED: Record<number, OwnedProfile> = {
  1086940: { lastPlayedDays: 0, purchasedDays: 420, twoWeeks: 780, paid: 59.99, unlocked: 41, status: "playing" },
  1145360: { lastPlayedDays: 1, purchasedDays: 900, twoWeeks: 210, paid: 16.99, unlocked: 44, status: "finished" },
  548430: { lastPlayedDays: 2, purchasedDays: 700, twoWeeks: 320, paid: 11.99, unlocked: 38, status: "playing" },
  427520: { lastPlayedDays: 3, purchasedDays: 1100, twoWeeks: 460, paid: 30, unlocked: 22, status: "playing" },
  1245620: { lastPlayedDays: 6, purchasedDays: 640, twoWeeks: 95, paid: 59.99, unlocked: 31, status: "finished" },
  413150: { lastPlayedDays: 9, purchasedDays: 1500, twoWeeks: 120, paid: 8.99, unlocked: 37, status: "finished" },
  504230: { lastPlayedDays: 21, purchasedDays: 800, twoWeeks: 0, paid: 4.99, unlocked: 30, status: "finished" },
  367520: { lastPlayedDays: 45, purchasedDays: 1200, twoWeeks: 0, paid: 7.49, unlocked: 40, status: "backlog" },
  105600: { lastPlayedDays: 190, purchasedDays: 2200, twoWeeks: 0, paid: 4.99, unlocked: 72, status: null },
  620: { lastPlayedDays: 260, purchasedDays: 2600, twoWeeks: 0, paid: 1.99, unlocked: 51, status: "finished" },
  1091500: { lastPlayedDays: null, purchasedDays: 60, twoWeeks: 0, paid: 29.99, unlocked: 0, status: "backlog" },
};

export const LIBRARY_GAMES: readonly DemoGameBase[] = DEMO_GAMES.filter(
  (game) => !WISHLIST_APP_IDS.has(game.appId),
);
export const WISHLIST_GAMES: readonly DemoGameBase[] = DEMO_GAMES.filter((game) =>
  WISHLIST_APP_IDS.has(game.appId),
);

export function gameId(appId: number): string {
  return `demo-game-${appId}`;
}

export function metaFor(appId: number): GameMeta {
  return META[appId];
}

export function ownedProfile(appId: number): OwnedProfile {
  return OWNED[appId];
}

export function isOwned(appId: number): boolean {
  return !WISHLIST_APP_IDS.has(appId);
}

export function currentPrice(appId: number): number {
  const meta = META[appId];
  return Math.round(meta.price * (100 - meta.discount)) / 100;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function roundHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export function isoDaysAgo(days: number | null): string | null {
  return days == null ? null : daysAgo(days);
}

export function findDemoGame(idOrAppId: string): DemoGameBase {
  const appId = Number(idOrAppId.replace(/^demo-game-/, ""));
  return DEMO_GAMES.find((game) => game.appId === appId) ?? LIBRARY_GAMES[0];
}

export function findOwnedGame(idOrAppId: string): DemoGameBase {
  const game = findDemoGame(idOrAppId);
  return isOwned(game.appId) ? game : LIBRARY_GAMES[0];
}

export function toGame(game: DemoGameBase): Game {
  const meta = META[game.appId];
  const headerImage = steamHeaderUrl(game.appId);
  const price = currentPrice(game.appId);
  return {
    id: gameId(game.appId),
    appId: game.appId,
    name: game.name,
    headerImage,
    releaseDate: meta.releaseDate,
    genres: [...game.genres],
    categories: meta.categories,
    tags: [...game.genres],
    developers: [meta.developer],
    publishers: [meta.publisher],
    reviewScore: meta.reviewScore,
    isFree: false,
    currentPrice: price,
    lowestPrice: meta.lowest,
    deckStatus: meta.deckStatus,
    controllers: ["full"],
    multiplayerCaps: meta.maxPlayers > 1 ? ["co-op"] : [],
    stores: ["steam"],
    listings: [
      {
        id: `demo-listing-${game.appId}`,
        store: "steam",
        externalId: String(game.appId),
        headerImage,
        storeUrl: null,
        isFree: false,
        currentPrice: price,
        lowestPrice: meta.lowest,
        priceCurrency: DEMO_CURRENCY,
      },
    ],
  };
}

export function toLibraryEntry(game: DemoGameBase): LibraryEntry {
  const owned = OWNED[game.appId];
  const meta = META[game.appId];
  const hours = game.minutes / 60;
  const lastPlayedAt = isoDaysAgo(owned.lastPlayedDays);
  return {
    id: `demo-entry-${game.appId}`,
    playtimeForever: game.minutes,
    playtime2Weeks: owned.twoWeeks,
    lastPlayedAt,
    pricePaid: owned.paid,
    purchasedAt: daysAgo(owned.purchasedDays),
    isFamilyShared: false,
    hidden: false,
    stores: ["steam"],
    ownerships: [
      {
        store: "steam",
        playtimeForever: game.minutes,
        lastPlayedAt,
        pricePaid: owned.paid,
        isFamilyShared: false,
      },
    ],
    achievementUnlocked: owned.unlocked,
    achievementTotal: meta.achievementTotal,
    achievementPct: Math.round((owned.unlocked / meta.achievementTotal) * 100),
    userStatus: owned.status,
    userStatusAt: owned.status ? daysAgo((owned.lastPlayedDays ?? 14) + 1) : null,
    valueAmount: owned.paid,
    costPerHour: hours > 0 ? roundMoney(owned.paid / hours) : null,
    game: toGame(game),
  };
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function textParam(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function paginate<T>(
  items: readonly T[],
  query: Record<string, unknown>,
  defaultPageSize: number,
): { total: number; page: number; pageSize: number; items: T[] } {
  const page = positiveInt(query.page, 1);
  const pageSize = Math.min(positiveInt(query.pageSize, defaultPageSize), MAX_PAGE_SIZE);
  const start = (page - 1) * pageSize;
  return {
    total: items.length,
    page,
    pageSize,
    items: items.slice(start, start + pageSize),
  };
}
