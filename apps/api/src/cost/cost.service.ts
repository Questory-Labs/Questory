import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "../sync/sync.service";
import { parseStringArray } from "../lib/json-arrays";
import { resolveDisplayCurrency } from "../lib/currency";
import { isStoreId, StoreId } from "../stores/store.constants";

@Injectable()
export class CostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
  ) {}

  async refreshPrices(userId: string) {
    return this.sync.syncLibraryPrices(userId, 120);
  }

  async summary(userId: string) {
    const [user, purchases, library] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.purchase.findMany({ where: { userId } }),
      this.prisma.libraryEntry.findMany({
        where: { userId, hidden: false },
        include: {
          game: { include: { storeListings: true } },
          ownerships: { include: { listing: true } },
        },
      }),
    ]);

    const pricedCount = library.filter(
      (e) => e.game.currentPrice != null || e.game.isFree,
    ).length;
    if (library.length > 0 && pricedCount < Math.min(10, library.length)) {
      await this.sync.syncLibraryPrices(userId, 40);
      const refreshed = await this.prisma.libraryEntry.findMany({
        where: { userId, hidden: false },
        include: {
          game: { include: { storeListings: true } },
          ownerships: { include: { listing: true } },
        },
      });
      library.splice(0, library.length, ...refreshed);
    }

    const paidByGame = new Map<string, number>();
    for (const p of purchases) {
      const key =
        p.gameId ||
        (p.appId != null
          ? library.find((e) => e.game.appId === p.appId)?.gameId
          : null);
      if (!key) continue;
      paidByGame.set(key, (paidByGame.get(key) || 0) + p.amount);
    }
    for (const e of library) {
      if (e.pricePaid != null && !paidByGame.has(e.gameId)) {
        paidByGame.set(e.gameId, e.pricePaid);
      }
    }

    let lifetimeAtCurrent = 0;
    let lifetimeAtLowest = 0;
    let lifetimePaid = 0;
    let pricedGames = 0;
    const effectiveByGame = new Map<string, number>();

    for (const e of library) {
      const ownedListingPrices = e.ownerships
        .map((o) => o.listing)
        .filter((l): l is NonNullable<typeof l> => l != null)
        .map((l) => (l.isFree ? 0 : l.currentPrice))
        .filter((p): p is number => p != null);
      const current =
        ownedListingPrices.length > 0
          ? Math.min(...ownedListingPrices)
          : e.game.isFree
            ? 0
            : e.game.currentPrice != null
              ? e.game.currentPrice
              : null;
      const ownedLows = e.ownerships
        .map((o) => o.listing)
        .filter((l): l is NonNullable<typeof l> => l != null)
        .map((l) => (l.isFree ? 0 : l.lowestPrice ?? l.currentPrice))
        .filter((p): p is number => p != null);
      const lowest =
        ownedLows.length > 0
          ? Math.min(...ownedLows)
          : e.game.isFree
            ? 0
            : e.game.lowestPrice != null
              ? e.game.lowestPrice
              : current;

      if (current != null) {
        lifetimeAtCurrent += current;
        lifetimeAtLowest += lowest ?? current;
        pricedGames += 1;
      }

      const paid = paidByGame.get(e.gameId);
      if (paid != null) {
        lifetimePaid += paid;
        effectiveByGame.set(e.gameId, paid);
      } else if (current != null) {
        effectiveByGame.set(e.gameId, current);
      }
    }

    const hasPaidData = paidByGame.size > 0;
    const lifetimeSpending = hasPaidData ? lifetimePaid : lifetimeAtCurrent;

    const totalMinutes = library.reduce((s, e) => s + e.playtimeForever, 0);
    const totalHours = totalMinutes / 60;
    const costPerHour =
      totalHours > 0 ? lifetimeSpending / totalHours : lifetimeSpending;

    const neverPlayed = library.filter(
      (e) => e.playtimeForever === 0 && effectiveByGame.has(e.gameId),
    );
    const underOneHour = library.filter(
      (e) =>
        e.playtimeForever > 0 &&
        e.playtimeForever < 60 &&
        effectiveByGame.has(e.gameId),
    );
    const moneyWasted =
      neverPlayed.reduce((s, e) => s + (effectiveByGame.get(e.gameId) || 0), 0) +
      underOneHour.reduce((s, e) => s + (effectiveByGame.get(e.gameId) || 0), 0);

    const salePurchases = purchases.filter((p) => (p.discountPct || 0) > 0);
    const averageDiscount =
      salePurchases.length > 0
        ? salePurchases.reduce((s, p) => s + (p.discountPct || 0), 0) /
          salePurchases.length
        : 0;

    const byGenreMap = new Map<string, number>();
    const byPublisherMap = new Map<string, number>();
    for (const e of library) {
      const amount = effectiveByGame.get(e.gameId) || 0;
      if (!amount) continue;
      const genres = parseStringArray(e.game.genres);
      const genreList = genres.length ? genres : ["Unknown"];
      for (const g of genreList) {
        byGenreMap.set(g, (byGenreMap.get(g) || 0) + amount / genreList.length);
      }
      const publishers = parseStringArray(e.game.publishers);
      const publisherList = publishers.length ? publishers : ["Unknown"];
      for (const pub of publisherList) {
        byPublisherMap.set(
          pub,
          (byPublisherMap.get(pub) || 0) + amount / publisherList.length,
        );
      }
    }

    const storeCurrency = library.find(
      (e) => e.game.priceCurrency,
    )?.game.priceCurrency;

    return {
      lifetimeSpending: round2(lifetimeSpending),
      lifetimeAtCurrent: round2(lifetimeAtCurrent),
      lifetimeAtLowest: round2(lifetimeAtLowest),
      pricedGameCount: pricedGames,
      librarySize: library.length,
      usingStoreEstimates: !hasPaidData,
      currency: resolveDisplayCurrency({
        priceCurrency: storeCurrency,
        purchaseCurrency: purchases[0]?.currency,
        countryCode: user?.countryCode,
      }),
      costPerHour: round2(costPerHour),
      moneyWasted: round2(moneyWasted),
      neverPlayedCount: neverPlayed.length,
      underOneHourCount: underOneHour.length,
      salePurchaseCount: salePurchases.length,
      averageDiscount: round2(averageDiscount),
      byGenre: [...byGenreMap.entries()]
        .map(([genre, amount]) => ({ genre, amount: round2(amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 15),
      byPublisher: [...byPublisherMap.entries()]
        .map(([publisher, amount]) => ({ publisher, amount: round2(amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 15),
    };
  }

  async roi(userId: string) {
    const library = await this.prisma.libraryEntry.findMany({
      where: { userId, hidden: false },
      include: {
        game: true,
        ownerships: { include: { listing: true } },
      },
    });
    const purchases = await this.prisma.purchase.findMany({ where: { userId } });
    const paidByGame = new Map<string, number>();
    for (const p of purchases) {
      const key =
        p.gameId ||
        (p.appId != null
          ? library.find((e) => e.game.appId === p.appId)?.gameId
          : null);
      if (!key) continue;
      paidByGame.set(key, (paidByGame.get(key) || 0) + p.amount);
    }
    for (const e of library) {
      if (e.pricePaid != null && !paidByGame.has(e.gameId)) {
        paidByGame.set(e.gameId, e.pricePaid);
      }
    }

    return library
      .map((e) => {
        const paid = paidByGame.get(e.gameId);
        const ownedListingPrices = e.ownerships
          .map((o) => o.listing)
          .filter((l): l is NonNullable<typeof l> => l != null)
          .map((l) => (l.isFree ? 0 : l.currentPrice))
          .filter((p): p is number => p != null);
        const current =
          ownedListingPrices.length > 0
            ? Math.min(...ownedListingPrices)
            : e.game.isFree
              ? 0
              : e.game.currentPrice != null
                ? e.game.currentPrice
                : null;
        const ownedLows = e.ownerships
          .map((o) => o.listing)
          .filter((l): l is NonNullable<typeof l> => l != null)
          .map((l) => (l.isFree ? 0 : l.lowestPrice ?? l.currentPrice))
          .filter((p): p is number => p != null);
        const lowest =
          ownedLows.length > 0
            ? Math.min(...ownedLows)
            : e.game.isFree
              ? 0
              : e.game.lowestPrice != null
                ? e.game.lowestPrice
                : current;
        const amount = paid ?? current;
        if (amount == null) return null;
        const hours = e.playtimeForever / 60;
        const stores = [
          ...new Set(
            e.ownerships.map((o) => o.store).filter(isStoreId),
          ),
        ] as StoreId[];
        return {
          gameId: e.gameId,
          appId: e.game.appId,
          name: e.game.name,
          headerImage: e.game.headerImage,
          stores,
          amount: round2(amount),
          currentPrice: current != null ? round2(current) : null,
          lowestPrice: lowest != null ? round2(lowest) : null,
          hours: round2(hours),
          costPerHour: hours > 0 ? round2(amount / hours) : null,
          priceSource: paid != null ? ("paid" as const) : ("store" as const),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => {
        if (a.costPerHour == null) return 1;
        if (b.costPerHour == null) return -1;
        return a.costPerHour - b.costPerHour;
      });
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
