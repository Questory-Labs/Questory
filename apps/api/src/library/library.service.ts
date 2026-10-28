import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  LibraryFacets,
  LibrarySort,
  LibraryStatusFilter,
  LibraryUserStatus,
} from "@questorylabs/shared";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  containsIgnoreCase,
  includesIgnoreCase,
  parseStringArray,
} from "../lib/json-arrays";
import { currencyFromCountry, resolveDisplayCurrency } from "../lib/currency";
import { buildPaidByGame, buildRoiRow } from "../cost/cost-roi";
import { isStoreId, StoreId } from "../stores/store.constants";

export type LibraryFilters = {
  q?: string;
  genre?: string;
  tag?: string;
  store?: string;
  minPlaytime?: number;
  maxPlaytime?: number;
  unplayed?: boolean;
  multiplayer?: boolean;
  singleplayer?: boolean;
  coop?: boolean;
  pvp?: boolean;
  deck?: boolean;
  controller?: boolean;
  publisher?: string;
  developer?: string;
  sort?: LibrarySort;
  status?: LibraryStatusFilter;
  page?: number;
  pageSize?: number;
};

const USER_STATUSES: LibraryUserStatus[] = [
  "playing",
  "backlog",
  "finished",
  "dropped",
];

function matchesStatus(
  e: { playtimeForever: number; userStatus: string | null },
  status: LibraryStatusFilter,
) {
  if (status === "neverPlayed") return e.playtimeForever === 0;
  return e.userStatus === status;
}

function asUserStatus(value: string | null): LibraryUserStatus | null {
  return USER_STATUSES.includes(value as LibraryUserStatus)
    ? (value as LibraryUserStatus)
    : null;
}

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, filters: LibraryFilters) {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 24));
    const where: Prisma.LibraryEntryWhereInput = {
      userId,
      hidden: false,
    };

    if (filters.unplayed) where.playtimeForever = 0;
    if (filters.minPlaytime != null || filters.maxPlaytime != null) {
      where.playtimeForever = {
        ...(filters.minPlaytime != null ? { gte: filters.minPlaytime } : {}),
        ...(filters.maxPlaytime != null ? { lte: filters.maxPlaytime } : {}),
      };
    }

    const storeFilter =
      filters.store && isStoreId(filters.store) ? filters.store : undefined;
    if (storeFilter) {
      where.ownerships = { some: { store: storeFilter } };
    }

    const gameWhere: Prisma.GameWhereInput = {};
    if (filters.deck) gameWhere.deckStatus = { in: ["verified", "playable"] };
    if (Object.keys(gameWhere).length) where.game = gameWhere;

    const [all, purchases, user] = await Promise.all([
      this.prisma.libraryEntry.findMany({
        where,
        include: {
          game: { include: { storeListings: true } },
          ownerships: { include: { listing: true } },
        },
        orderBy: [{ lastPlayedAt: "desc" }, { playtimeForever: "desc" }],
      }),
      this.prisma.purchase.findMany({
        where: { userId },
        select: { gameId: true, appId: true, amount: true, currency: true },
      }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const filtered = all.filter((e) => {
      const genres = parseStringArray(e.game.genres);
      const tags = parseStringArray(e.game.tags);
      const categories = parseStringArray(e.game.categories);
      const publishers = parseStringArray(e.game.publishers);
      const developers = parseStringArray(e.game.developers);
      const controllers = parseStringArray(e.game.controllers);
      const multiplayerCaps = parseStringArray(e.game.multiplayerCaps);

      if (filters.genre && !includesIgnoreCase(genres, filters.genre)) return false;
      if (filters.tag && !includesIgnoreCase(tags, filters.tag)) return false;
      if (filters.publisher && !includesIgnoreCase(publishers, filters.publisher)) {
        return false;
      }
      if (filters.developer && !includesIgnoreCase(developers, filters.developer)) {
        return false;
      }
      if (filters.controller && controllers.length === 0) return false;
      if (filters.singleplayer && !includesIgnoreCase(categories, "Single-player")) {
        return false;
      }
      if (filters.pvp && !includesIgnoreCase(categories, "PvP")) return false;
      if (filters.multiplayer) {
        const ok =
          includesIgnoreCase(categories, "Multi-player") ||
          multiplayerCaps.length > 0;
        if (!ok) return false;
      }
      if (filters.coop) {
        const ok =
          categories.some((c) => /co-op/i.test(c)) ||
          multiplayerCaps.some((c) => /co-op/i.test(c));
        if (!ok) return false;
      }
      if (filters.q) {
        const q = filters.q;
        const ok =
          containsIgnoreCase(e.game.name, q) ||
          tags.some((t) => containsIgnoreCase(t, q)) ||
          publishers.some((p) => containsIgnoreCase(p, q));
        if (!ok) return false;
      }
      return true;
    });

    const facets: LibraryFacets = {
      all: filtered.length,
      neverPlayed: 0,
      playing: 0,
      backlog: 0,
      finished: 0,
      dropped: 0,
    };
    for (const e of filtered) {
      if (e.playtimeForever === 0) facets.neverPlayed += 1;
      const s = asUserStatus(e.userStatus);
      if (s) facets[s] += 1;
    }

    const paidByGame = buildPaidByGame(all, purchases);
    const valueByEntry = new Map(
      filtered.map((e) => {
        const row = buildRoiRow(e, paidByGame);
        return [
          e.id,
          { amount: row?.amount ?? null, costPerHour: row?.costPerHour ?? null },
        ];
      }),
    );

    const statusFiltered = filters.status
      ? filtered.filter((e) => matchesStatus(e, filters.status!))
      : filtered;
    const sorted = this.sortEntries(statusFiltered, filters.sort, valueByEntry);

    const total = sorted.length;
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      pageSize,
      currency: resolveDisplayCurrency({
        purchaseCurrency: purchases[0]?.currency,
        countryCode: user?.countryCode,
      }),
      facets,
      items: items.map((e) => this.mapEntry(e, valueByEntry.get(e.id))),
    };
  }

  private sortEntries<
    T extends {
      id: string;
      playtimeForever: number;
      lastPlayedAt: Date | null;
      game: { name: string };
    },
  >(
    entries: T[],
    sort: LibrarySort | undefined,
    values: Map<string, { costPerHour: number | null }>,
  ): T[] {
    if (!sort || sort === "lastPlayed") return entries;
    const copy = [...entries];
    if (sort === "hours") {
      return copy.sort((a, b) => b.playtimeForever - a.playtimeForever);
    }
    if (sort === "name") {
      return copy.sort((a, b) =>
        a.game.name.localeCompare(b.game.name, undefined, { sensitivity: "base" }),
      );
    }
    return copy.sort((a, b) => {
      const av = values.get(a.id)?.costPerHour ?? null;
      const bv = values.get(b.id)?.costPerHour ?? null;
      if (av == null && bv == null) return b.playtimeForever - a.playtimeForever;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    });
  }

  async setStatus(
    userId: string,
    gameId: string,
    status: LibraryUserStatus | null,
  ) {
    const entry = await this.prisma.libraryEntry.findFirst({
      where: { userId, gameId },
      select: { id: true },
    });
    if (!entry) throw new NotFoundException("Game not in your library");
    const updated = await this.prisma.libraryEntry.update({
      where: { id: entry.id },
      data: { userStatus: status, userStatusAt: status ? new Date() : null },
      include: {
        game: { include: { storeListings: true } },
        ownerships: { include: { listing: true } },
      },
    });
    return this.mapEntry(updated);
  }

  async getOne(userId: string, gameId: string) {
    const entry = await this.prisma.libraryEntry.findFirst({
      where: { userId, gameId },
      include: {
        game: { include: { storeListings: true } },
        ownerships: { include: { listing: true } },
      },
    });
    return entry ? this.mapEntry(entry) : null;
  }

  /** Compat: resolve by Steam appId. */
  async getOneByAppId(userId: string, appId: number) {
    const entry = await this.prisma.libraryEntry.findFirst({
      where: { userId, game: { appId } },
      include: {
        game: { include: { storeListings: true } },
        ownerships: { include: { listing: true } },
      },
    });
    return entry ? this.mapEntry(entry) : null;
  }

  async updatePrice(
    userId: string,
    gameId: string,
    pricePaid: number,
    purchasedAt?: string,
  ) {
    const entry = await this.prisma.libraryEntry.findFirst({
      where: { userId, gameId },
      include: { game: true, ownerships: true },
    });
    if (!entry) return null;
    const updated = await this.prisma.libraryEntry.update({
      where: { id: entry.id },
      data: {
        pricePaid,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : entry.purchasedAt,
      },
      include: {
        game: { include: { storeListings: true } },
        ownerships: { include: { listing: true } },
      },
    });
    const when = purchasedAt ? new Date(purchasedAt) : new Date();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const currency =
      entry.game.priceCurrency ||
      currencyFromCountry(user?.countryCode);
    const store = (entry.ownerships[0]?.store || "steam") as StoreId;
    const externalId =
      entry.ownerships[0]?.listingId
        ? (
            await this.prisma.gameStoreListing.findUnique({
              where: { id: entry.ownerships[0].listingId },
            })
          )?.externalId
        : entry.game.appId != null
          ? String(entry.game.appId)
          : null;

    const prior = await this.prisma.purchase.findFirst({
      where: {
        userId,
        OR: [
          ...(entry.game.appId != null
            ? [{ appId: entry.game.appId, source: "manual" }]
            : []),
          ...(externalId
            ? [{ store, externalId, source: "manual" }]
            : []),
          { gameId: entry.gameId, source: "manual" },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (prior) {
      await this.prisma.purchase.update({
        where: { id: prior.id },
        data: {
          amount: pricePaid,
          purchasedAt: when,
          currency,
          gameId: entry.gameId,
          store,
          externalId: externalId ?? undefined,
          appId: entry.game.appId ?? undefined,
        },
      });
    } else {
      await this.prisma.purchase.create({
        data: {
          userId,
          gameId: entry.gameId,
          store,
          externalId: externalId ?? undefined,
          appId: entry.game.appId ?? undefined,
          amount: pricePaid,
          currency,
          purchasedAt: when,
          source: "manual",
        },
      });
    }
    return this.mapEntry(updated);
  }

  private mapEntry(
    e: {
      id: string;
      playtimeForever: number;
      playtime2Weeks: number | null;
      lastPlayedAt: Date | null;
      pricePaid: number | null;
      purchasedAt: Date | null;
      isFamilyShared: boolean;
      hidden: boolean;
      achievementUnlocked?: number | null;
      achievementTotal?: number | null;
      achievementPct?: number | null;
      userStatus?: string | null;
      userStatusAt?: Date | null;
      ownerships: Array<{
        store: string;
        playtimeForever: number;
        lastPlayedAt: Date | null;
        pricePaid: number | null;
        isFamilyShared: boolean;
        listing: {
          id: string;
          store: string;
          externalId: string;
          headerImage: string | null;
          storeUrl: string | null;
          isFree: boolean;
          currentPrice: number | null;
          lowestPrice: number | null;
          priceCurrency: string | null;
        } | null;
      }>;
      game: {
        id: string;
        appId: number | null;
        name: string;
        headerImage: string | null;
        genres: string;
        categories: string;
        tags: string;
        developers: string;
        publishers: string;
        reviewScore: number | null;
        isFree: boolean;
        currentPrice: number | null;
        lowestPrice: number | null;
        deckStatus: string | null;
        controllers: string;
        multiplayerCaps: string;
        storeListings?: Array<{
          id: string;
          store: string;
          externalId: string;
          headerImage: string | null;
          storeUrl: string | null;
          isFree: boolean;
          currentPrice: number | null;
          lowestPrice: number | null;
          priceCurrency: string | null;
        }>;
      };
    },
    value?: { amount: number | null; costPerHour: number | null },
  ) {
    const stores = [
      ...new Set(e.ownerships.map((o) => o.store).filter(isStoreId)),
    ];
    const listings = (e.game.storeListings || []).map((l) => ({
      id: l.id,
      store: l.store as StoreId,
      externalId: l.externalId,
      headerImage: l.headerImage,
      storeUrl: l.storeUrl,
      isFree: l.isFree,
      currentPrice: l.currentPrice,
      lowestPrice: l.lowestPrice,
      priceCurrency: l.priceCurrency,
    }));

    return {
      id: e.id,
      playtimeForever: e.playtimeForever,
      playtime2Weeks: e.playtime2Weeks,
      lastPlayedAt: e.lastPlayedAt?.toISOString() ?? null,
      pricePaid: e.pricePaid,
      purchasedAt: e.purchasedAt?.toISOString() ?? null,
      isFamilyShared: e.isFamilyShared,
      hidden: e.hidden,
      achievementUnlocked: e.achievementUnlocked ?? null,
      achievementTotal: e.achievementTotal ?? null,
      achievementPct: e.achievementPct ?? null,
      userStatus: asUserStatus(e.userStatus ?? null),
      userStatusAt: e.userStatusAt?.toISOString() ?? null,
      ...(value
        ? { valueAmount: value.amount, costPerHour: value.costPerHour }
        : {}),
      stores,
      ownerships: e.ownerships.map((o) => ({
        store: o.store as StoreId,
        playtimeForever: o.playtimeForever,
        lastPlayedAt: o.lastPlayedAt?.toISOString() ?? null,
        pricePaid: o.pricePaid,
        isFamilyShared: o.isFamilyShared,
        listing: o.listing
          ? {
              id: o.listing.id,
              store: o.listing.store as StoreId,
              externalId: o.listing.externalId,
              headerImage: o.listing.headerImage,
              storeUrl: o.listing.storeUrl,
              isFree: o.listing.isFree,
              currentPrice: o.listing.currentPrice,
              lowestPrice: o.listing.lowestPrice,
              priceCurrency: o.listing.priceCurrency,
            }
          : null,
      })),
      game: {
        id: e.game.id,
        appId: e.game.appId,
        name: e.game.name,
        headerImage: e.game.headerImage,
        genres: parseStringArray(e.game.genres),
        categories: parseStringArray(e.game.categories),
        tags: parseStringArray(e.game.tags),
        developers: parseStringArray(e.game.developers),
        publishers: parseStringArray(e.game.publishers),
        reviewScore: e.game.reviewScore,
        isFree: e.game.isFree,
        currentPrice: e.game.currentPrice,
        lowestPrice: e.game.lowestPrice,
        deckStatus: e.game.deckStatus,
        controllers: parseStringArray(e.game.controllers),
        multiplayerCaps: parseStringArray(e.game.multiplayerCaps),
        stores,
        listings,
      },
    };
  }
}
