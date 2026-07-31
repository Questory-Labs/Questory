import type { ParsedSearchQuery } from "@questorylabs/shared";
import { textForScope } from "@questorylabs/shared";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  containsIgnoreCase,
  includesIgnoreCase,
  parseStringArray,
} from "../lib/json-arrays";
import { containsInsensitive } from "./search-text";

function gameWhere(
  parsed: ParsedSearchQuery,
): Prisma.GameWhereInput | undefined {
  const filters = parsed.filters;
  const where: Prisma.GameWhereInput = {};

  if (filters.deck === "true") {
    where.deckStatus = { in: ["verified", "playable"] };
  }

  const text = textForScope(parsed, "game");
  if (text) {
    where.name = containsInsensitive(text);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export async function searchGames(
  prisma: PrismaService,
  userId: string,
  parsed: ParsedSearchQuery,
  limit: number,
) {
  const text = textForScope(parsed, "game");
  const filters = parsed.filters;
  const libraryWhere: Prisma.LibraryEntryWhereInput = { userId };

  if (filters.hours) {
    const hoursMatch = filters.hours.match(/^(<|>|<=|>=)?(\d+)$/);
    if (hoursMatch) {
      const op = hoursMatch[1] || "<";
      const minutes = Number(hoursMatch[2]) * 60;
      if (op === "<" || op === "<=") libraryWhere.playtimeForever = { lte: minutes };
      if (op === ">" || op === ">=") libraryWhere.playtimeForever = { gte: minutes };
    }
  }
  if (filters.completed === "true") {
    libraryWhere.playtimeForever = { gte: 60 };
  }

  const gameFilter = gameWhere(parsed);
  if (gameFilter) {
    libraryWhere.game = gameFilter;
  }

  const [libraryGamesRaw, wishlist, catalog] = await Promise.all([
    prisma.libraryEntry.findMany({
      where: libraryWhere,
      include: { game: true },
      take: limit,
      orderBy: { syncedAt: "desc" },
    }),
    prisma.wishlistItem.findMany({
      where: {
        userId,
        ...(text ? { name: containsInsensitive(text) } : {}),
        ...(filters.price
          ? (() => {
              const m = filters.price.match(/^(<|>|<=|>=)?(\d+(?:\.\d+)?)$/);
              if (!m) return {};
              const op = m[1] || "<";
              const amount = Number(m[2]);
              if (op.startsWith("<")) return { currentPrice: { lte: amount } };
              return { currentPrice: { gte: amount } };
            })()
          : {}),
      },
      take: limit,
      orderBy: { name: "asc" },
    }),
    text
      ? prisma.steamCatalogApp.findMany({
          where: { name: containsInsensitive(text) },
          take: Math.min(limit, 12),
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const libraryGames = libraryGamesRaw
    .filter((e) => {
      const genres = parseStringArray(e.game.genres);
      const publishers = parseStringArray(e.game.publishers);
      const developers = parseStringArray(e.game.developers);
      const categories = parseStringArray(e.game.categories);
      if (filters.genre && !includesIgnoreCase(genres, filters.genre)) return false;
      if (filters.publisher && !includesIgnoreCase(publishers, filters.publisher)) {
        return false;
      }
      if (filters.developer && !includesIgnoreCase(developers, filters.developer)) {
        return false;
      }
      if (filters.coop && !categories.some((c) => /co-op/i.test(c))) return false;
      return true;
    })
    .slice(0, limit);

  const developers = new Set<string>();
  const publishers = new Set<string>();
  for (const e of libraryGames) {
    for (const d of parseStringArray(e.game.developers)) {
      if (!text || containsIgnoreCase(d, text)) developers.add(d);
    }
    for (const p of parseStringArray(e.game.publishers)) {
      if (!text || containsIgnoreCase(p, text)) publishers.add(p);
    }
  }

  const seenAppIds = new Set<number>();
  const games = [
    ...libraryGames.map((e) => ({
      appId: e.game.appId,
      gameId: e.gameId,
      name: e.game.name,
      headerImage: e.game.headerImage,
      source: "library" as const,
    })),
    ...wishlist.map((w) => ({
      appId: w.appId,
      gameId: null,
      name: w.name || `App ${w.appId}`,
      headerImage: w.headerImage,
      source: "wishlist" as const,
    })),
    ...catalog.map((c) => ({
      appId: c.appId,
      gameId: null,
      name: c.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${c.appId}/header.jpg`,
      source: "catalog" as const,
    })),
  ]
    .filter((g): g is (typeof g & { appId: number }) => {
      if (g.appId == null || g.appId <= 0) return false;
      if (seenAppIds.has(g.appId)) return false;
      seenAppIds.add(g.appId);
      return true;
    })
    .slice(0, limit);

  return {
    games,
    developers: [...developers].slice(0, limit),
    publishers: [...publishers].slice(0, limit),
  };
}
