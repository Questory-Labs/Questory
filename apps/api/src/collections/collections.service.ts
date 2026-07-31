import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { parseStringArray } from "../lib/json-arrays";
import { COLLECTION_GAMES_PAGE_SIZE } from "./collections.constants";

const AUTO_RULES: {
  key: string;
  name: string;
  description: string;
  match: (entry: {
    playtimeForever: number;
    lastPlayedAt: Date | null;
    purchasedAt: Date | null;
    game: {
      genres: string[];
      tags: string[];
      categories: string[];
      deckStatus: string | null;
      reviewScore: number | null;
    };
  }) => boolean;
}[] = [
  {
    key: "never_played",
    name: "Never Played",
    description: "Games still waiting for their first launch",
    match: (e) => e.playtimeForever === 0,
  },
  {
    key: "under_5_hours",
    name: "Under 5 Hours",
    description: "Short sessions and quick clears",
    match: (e) => e.playtimeForever > 0 && e.playtimeForever < 300,
  },
  {
    key: "weekend_games",
    name: "Weekend Games",
    description: "Co-op and party-friendly picks",
    match: (e) =>
      e.game.categories.some((c) => /co-op|multi-player|remote play together/i.test(c)),
  },
  {
    key: "hidden_gems",
    name: "Hidden Gems",
    description: "Well-reviewed games with low playtime",
    match: (e) =>
      (e.game.reviewScore || 0) >= 80 && e.playtimeForever < 120,
  },
  {
    key: "recently_purchased",
    name: "Recently Purchased",
    description: "Added or bought in the last 90 days",
    match: (e) => {
      if (!e.purchasedAt) return false;
      return Date.now() - e.purchasedAt.getTime() < 1000 * 60 * 60 * 24 * 90;
    },
  },
  {
    key: "couch_coop",
    name: "Couch Co-op",
    description: "Local co-op ready",
    match: (e) =>
      e.game.categories.some((c) => /local co-op|shared\/split/i.test(c)),
  },
  {
    key: "story_rich",
    name: "Story Rich",
    description: "Narrative-forward titles",
    match: (e) =>
      [...e.game.genres, ...e.game.tags].some((t) =>
        /story|narrative|adventure/i.test(t),
      ),
  },
  {
    key: "roguelikes",
    name: "Roguelikes",
    description: "Roguelike and roguelite games",
    match: (e) =>
      [...e.game.genres, ...e.game.tags, ...e.game.categories].some((t) =>
        /roguelike|roguelite/i.test(t),
      ),
  },
  {
    key: "soulslikes",
    name: "Soulslikes",
    description: "Souls-like challenge games",
    match: (e) =>
      [...e.game.genres, ...e.game.tags].some((t) =>
        /souls|soulslike/i.test(t),
      ),
  },

  {
    key: "steam_deck_ready",
    name: "Steam Deck Ready",
    description: "Verified or playable on Deck",
    match: (e) =>
      e.game.deckStatus === "verified" || e.game.deckStatus === "playable",
  },
];

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async rebuildAutoCollections(userId: string) {
    const library = await this.prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: true },
    });

    for (const rule of AUTO_RULES) {
      const matched = library.filter((e) =>
        rule.match({
          playtimeForever: e.playtimeForever,
          lastPlayedAt: e.lastPlayedAt,
          purchasedAt: e.purchasedAt,
          game: {
            genres: parseStringArray(e.game.genres),
            tags: parseStringArray(e.game.tags),
            categories: parseStringArray(e.game.categories),
            deckStatus: e.game.deckStatus,
            reviewScore: e.game.reviewScore,
          },
        }),
      );

      // Soulslikes: also match by game name
      const extras =
        rule.key === "soulslikes"
          ? library.filter((e) =>
              /dark souls|elden ring|sekiro|lies of p|nioh|bloodborne/i.test(
                e.game.name,
              ),
            )
          : [];
      const games = [...new Map([...matched, ...extras].map((e) => [e.gameId, e])).values()];

      const collection = await this.prisma.collection.upsert({
        where: { userId_name: { userId, name: rule.name } },
        create: {
          userId,
          name: rule.name,
          type: "auto",
          ruleKey: rule.key,
          description: rule.description,
        },
        update: {
          type: "auto",
          ruleKey: rule.key,
          description: rule.description,
        },
      });

      await this.prisma.collectionItem.deleteMany({
        where: { collectionId: collection.id },
      });
      if (games.length) {
        await this.prisma.collectionItem.createMany({
          data: games.map((e) => ({
            collectionId: collection.id,
            gameId: e.gameId,
          })),
        });

      }
    }
  }

  async list(userId: string) {
    await this.ensureAutos(userId);
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as "auto" | "custom",
      ruleKey: c.ruleKey,
      description: c.description,
      gameCount: c._count.items,
    }));
  }

  private async ensureAutos(userId: string) {
    const count = await this.prisma.collection.count({
      where: { userId, type: "auto" },
    });
    if (count === 0) await this.rebuildAutoCollections(userId);
  }

  async getOne(
    userId: string,
    id: string,
    opts: { page?: number; pageSize?: number } = {},
  ) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, userId },
    });
    if (!collection) throw new NotFoundException();

    const take = Math.min(
      Math.max(opts.pageSize ?? COLLECTION_GAMES_PAGE_SIZE, 1),
      100,
    );
    const safePage = Math.max(opts.page ?? 1, 1);
    const skip = (safePage - 1) * take;

    const [total, items] = await Promise.all([
      this.prisma.collectionItem.count({
        where: { collectionId: collection.id },
      }),
      this.prisma.collectionItem.findMany({
        where: { collectionId: collection.id },
        include: { game: true },
        orderBy: { game: { name: "asc" } },
        skip,
        take,
      }),
    ]);

    return {
      id: collection.id,
      name: collection.name,
      type: collection.type,
      ruleKey: collection.ruleKey,
      description: collection.description,
      total,
      page: safePage,
      pageSize: take,
      games: items.map((i) => ({
        appId: i.game.appId,
        name: i.game.name,
        headerImage: i.game.headerImage,
        genres: parseStringArray(i.game.genres),
      })),
    };
  }

  async createCustom(userId: string, name: string, description?: string) {
    return this.prisma.collection.create({
      data: {
        userId,
        name,
        description,
        type: "custom",
      },
    });
  }

  async updateCustom(
    userId: string,
    id: string,
    data: { name?: string; description?: string },
  ) {
    const existing = await this.prisma.collection.findFirst({
      where: { id, userId, type: "custom" },
    });
    if (!existing) throw new NotFoundException();
    return this.prisma.collection.update({
      where: { id },
      data,
    });
  }

  async removeCustom(userId: string, id: string) {
    const existing = await this.prisma.collection.findFirst({
      where: { id, userId, type: "custom" },
    });
    if (!existing) throw new NotFoundException();
    await this.prisma.collection.delete({ where: { id } });
    return { ok: true };
  }

  async addGame(userId: string, collectionId: string, appId: number) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId, type: "custom" },
    });
    if (!collection) throw new NotFoundException();
    const game = await this.prisma.game.findFirst({ where: { appId } });
    if (!game) throw new NotFoundException("Game not found");
    await this.prisma.collectionItem.upsert({
      where: {
        collectionId_gameId: { collectionId, gameId: game.id },
      },
      create: { collectionId, gameId: game.id },
      update: {},
    });
    return { ok: true };
  }
}
