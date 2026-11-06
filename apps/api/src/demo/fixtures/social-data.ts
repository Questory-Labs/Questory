import {
  DEMO_USER_ID,
  parsePageParam,
  parsePageSizeParam,
} from "@questorylabs/shared";
import { DEMO_STEAM_ID, demoUser } from "../demo-user";
import { WISHLIST_GAMES } from "./games-catalog";
import { DEMO_FRIENDS, DEMO_GAMES, steamHeaderUrl } from "./helpers";
import { SOCIAL_CATALOG, type SocialCatalogMeta } from "./social-catalog";

export const VIEWER_STEAM_ID = DEMO_STEAM_ID;
export const VIEWER_NAME = demoUser(0).personaName;
export const VIEWER_CURRENCY = demoUser(0).currency;
export const VIEWER_USER_ID = DEMO_USER_ID;

export const [NOVA, MOSS, QUILL] = DEMO_FRIENDS;
export const FRIEND_USER_IDS = new Map<string, string | null>([
  [NOVA.steamId, "demo-friend-nova"],
  [MOSS.steamId, null],
  [QUILL.steamId, "demo-friend-quill"],
]);

const CYBERPUNK = 1091500;
const IT_TAKES_TWO = 1426210;
const VIEWER_WISHLIST_ONLY = new Set<number>(
  WISHLIST_GAMES.map((game) => game.appId),
);

export type SocialGame = {
  appId: number;
  name: string;
  minutes: number;
  genres: readonly string[];
} & SocialCatalogMeta;

export const SOCIAL_GAMES: SocialGame[] = DEMO_GAMES.map((game) => ({
  ...game,
  ...SOCIAL_CATALOG[game.appId],
}));

const GAME_BY_ID = new Map(SOCIAL_GAMES.map((game) => [game.appId, game]));

export function findGame(appId: number): SocialGame | undefined {
  return GAME_BY_ID.get(appId);
}

export function requireGame(appId: number): SocialGame {
  return GAME_BY_ID.get(appId) ?? SOCIAL_GAMES[0];
}

export function viewerOwns(appId: number): boolean {
  return !VIEWER_WISHLIST_ONLY.has(appId);
}

export function viewerLibrary(): SocialGame[] {
  return SOCIAL_GAMES.filter((game) => viewerOwns(game.appId));
}

export function gameRef(game: SocialGame) {
  return {
    appId: game.appId,
    name: game.name,
    headerImage: steamHeaderUrl(game.appId),
  };
}

export const FRIEND_LIBRARIES = new Map<string, ReadonlyMap<number, number>>([
  [
    NOVA.steamId,
    new Map([
      [1145360, 2140],
      [413150, 6120],
      [504230, 410],
      [620, 930],
      [105600, 8210],
      [1086940, 9840],
      [CYBERPUNK, 45],
      [548430, 5610],
      [892970, 2880],
      [646570, 2160],
      [728880, 720],
    ]),
  ],
  [
    MOSS.steamId,
    new Map([
      [367520, 5460],
      [620, 640],
      [105600, 4210],
      [1245620, 8880],
      [427520, 14220],
      [CYBERPUNK, 20],
      [548430, 11040],
      [892970, 6540],
      [IT_TAKES_TWO, 1320],
      [728880, 180],
    ]),
  ],
  [
    QUILL.steamId,
    new Map([
      [1145360, 3300],
      [413150, 9960],
      [367520, 1860],
      [504230, 2640],
      [620, 1500],
      [632470, 3180],
      [1086940, 6720],
      [CYBERPUNK, 0],
      [646570, 420],
      [728880, 1080],
    ]),
  ],
]);

export const FRIEND_RECENT_MINUTES = new Map<string, ReadonlyMap<number, number>>([
  [
    NOVA.steamId,
    new Map([
      [413150, 420],
      [1086940, 610],
      [548430, 180],
      [105600, 130],
      [1145360, 95],
    ]),
  ],
  [
    MOSS.steamId,
    new Map([
      [427520, 880],
      [548430, 540],
      [1245620, 260],
      [892970, 150],
      [IT_TAKES_TWO, 120],
    ]),
  ],
  [
    QUILL.steamId,
    new Map([
      [413150, 300],
      [1086940, 240],
      [632470, 210],
      [504230, 90],
      [728880, 60],
    ]),
  ],
]);

export const VIEWER_WISHLIST: readonly number[] = [...VIEWER_WISHLIST_ONLY];

export const FRIEND_WISHLISTS = new Map<string, readonly number[]>([
  [NOVA.steamId, [632470, 427520]],
  [MOSS.steamId, [1086940]],
  [QUILL.steamId, [IT_TAKES_TWO, 427520, 1245620]],
]);

export function viewerMinutes(appId: number): number {
  return findGame(appId)?.minutes ?? 0;
}

export function friendMinutes(steamId: string, appId: number): number | undefined {
  return FRIEND_LIBRARIES.get(steamId)?.get(appId);
}

export function libraryValue(appIds: Iterable<number>): number {
  let total = 0;
  for (const appId of appIds) total += findGame(appId)?.currentPrice ?? 0;
  return total;
}

export function hours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export function queryText(raw: unknown, maxLength: number): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, maxLength).toLowerCase();
}

export function queryPage(raw: unknown): number {
  return parsePageParam(typeof raw === "string" ? raw : undefined, 1) ?? 1;
}

export function queryPageSize(raw: unknown, fallback: number): number {
  const parsed = parsePageSizeParam(
    typeof raw === "string" ? raw : undefined,
    fallback,
  );
  return parsed ?? fallback;
}

export function pageOf<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
