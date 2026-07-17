import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  containsIgnoreCase,
  includesIgnoreCase,
  parseStringArray,
} from "../lib/json-arrays";

type ParsedQuery = {
  text: string;
  filters: Record<string, string>;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  parse(q: string): ParsedQuery {
    const filters: Record<string, string> = {};
    const parts = q.trim().split(/\s+/);
    const textParts: string[] = [];
    for (const part of parts) {
      const m = part.match(/^([a-zA-Z_]+):(.+)$/);
      if (m) filters[m[1].toLowerCase()] = m[2];
      else textParts.push(part);
    }
    return { text: textParts.join(" "), filters };
  }

  async search(userId: string, q: string) {
    const { text, filters } = this.parse(q || "");
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
    if (filters.deck === "true") {
      libraryWhere.game = { deckStatus: { in: ["verified", "playable"] } };
    }

    const [libraryGamesRaw, wishlist, friends, collections, catalog] =
      await Promise.all([
      this.prisma.libraryEntry.findMany({
        where: libraryWhere,
        include: { game: true },
        take: 200,
      }),
      this.prisma.wishlistItem.findMany({
        where: {
          userId,
          ...(text ? { name: { contains: text } } : {}),
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
        take: 20,
      }),
      this.prisma.friendship.findMany({
        where: {
          userId,
          ...(text ? { personaName: { contains: text } } : {}),
        },
        take: 20,
      }),
      this.prisma.collection.findMany({
        where: {
          userId,
          ...(text ? { name: { contains: text } } : {}),
        },
        include: { _count: { select: { items: true } } },
        take: 20,
      }),
      text
        ? this.prisma.steamCatalogApp.findMany({
            where: { name: { contains: text } },
            take: 12,
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
        if (text && !containsIgnoreCase(e.game.name, text)) return false;
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
      .slice(0, 20);

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
        name: e.game.name,
        headerImage: e.game.headerImage,
        source: "library" as const,
      })),
      ...wishlist.map((w) => ({
        appId: w.appId,
        name: w.name || `App ${w.appId}`,
        headerImage: w.headerImage,
        source: "wishlist" as const,
      })),
      ...catalog.map((c) => ({
        appId: c.appId,
        name: c.name,
        headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${c.appId}/header.jpg`,
        source: "catalog" as const,
      })),
    ]
      .filter((g) => {
        if (g.appId == null || g.appId <= 0) return false;
        if (seenAppIds.has(g.appId)) return false;
        seenAppIds.add(g.appId);
        return true;
      })
      .slice(0, 30);

    return {
      games,
      friends: friends.map((f) => ({
        steamId: f.friendSteamId,
        personaName: f.personaName,
        avatarUrl: f.avatarUrl,
        friendUserId: f.friendUserId,
      })),
      developers: [...developers].slice(0, 20),
      publishers: [...publishers].slice(0, 20),
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as "auto" | "custom",
        ruleKey: c.ruleKey,
        gameCount: c._count.items,
        description: c.description,
      })),
    };
  }
}
