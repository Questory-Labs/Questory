import type { SearchResult } from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import {
  WISHLIST_GAMES,
  LIBRARY_GAMES,
  gameId,
  ownedProfile,
  textParam,
} from "./games-catalog";
import { collectionSummaries } from "./games-library";
import { DEMO_FRIENDS, daysAgo, steamHeaderUrl } from "./helpers";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

function searchLimit(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;
}

function globalSearch(query: Record<string, unknown>): SearchResult {
  const needle = textParam(query.q).toLowerCase();
  const limit = searchLimit(query.limit);
  const matches = (name: string) => name.toLowerCase().includes(needle);
  const owned = LIBRARY_GAMES.filter((game) => matches(game.name)).map((game) => {
    const profile = ownedProfile(game.appId);
    return {
      appId: game.appId,
      gameId: gameId(game.appId),
      name: game.name,
      headerImage: steamHeaderUrl(game.appId),
      source: "library" as const,
      playtimeMinutes: game.minutes,
      lastPlayedAt: profile.lastPlayedDays == null ? null : daysAgo(profile.lastPlayedDays),
      userStatus: profile.status,
    };
  });
  const wished = WISHLIST_GAMES.filter((game) => matches(game.name)).map((game) => ({
    appId: game.appId,
    gameId: gameId(game.appId),
    name: game.name,
    headerImage: steamHeaderUrl(game.appId),
    source: "wishlist" as const,
  }));
  return {
    games: [...owned, ...wished].slice(0, limit),
    friends: DEMO_FRIENDS.filter((friend) => matches(friend.personaName))
      .slice(0, limit)
      .map((friend) => ({
        steamId: friend.steamId,
        personaName: friend.personaName,
        avatarUrl: null,
        friendUserId: null,
        libraryCached: true,
      })),
    developers: [],
    publishers: [],
    collections: collectionSummaries()
      .filter((collection) => matches(collection.name))
      .slice(0, limit)
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        type: collection.type,
        ruleKey: collection.ruleKey,
        gameCount: collection.gameCount,
        description: collection.description,
      })),
    music: { artists: [], albums: [], tracks: [] },
    watch: { movies: [], shows: [] },
    read: { titles: [] },
  };
}

export const searchRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/search", respond: ({ query }) => globalSearch(query) },
];
