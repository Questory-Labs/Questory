import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "../sync/sync.service";
import { resolveDisplayCurrency } from "../lib/currency";
import {
  buildAllRoiRows,
  buildPaidByGame,
  computeLibraryMix,
  computePlaytimeBuckets,
  computeShelfware,
  filterRoiRows,
  paginateRoiRows,
  round1,
  round2,
  sortRoiRows,
  sumGenrePublisherAmounts,
  type CostRoiSort,
  type CostRoiValueFilter,
} from "./cost-roi";
import {
  COST_ROI_PAGE_SIZE,
  COST_SHELFWARE_LIMIT,
} from "./cost.constants";

@Injectable()
export class CostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
  ) {}

  async refreshPrices(userId: string) {
    return this.sync.syncLibraryPrices(userId, 120);
  }

  private async loadLibraryContext(userId: string) {
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

    return { user, purchases, library };
  }

  async summary(userId: string) {
    const { user, purchases, library } = await this.loadLibraryContext(userId);
    const roiRows = buildAllRoiRows(library, purchases);
    const paidByGame = buildPaidByGame(library, purchases);

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
        .map((l) => (l.isFree ? 0 : (l.lowestPrice ?? l.currentPrice)))
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
    const totalHours = round1(totalMinutes / 60);
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
    const underOneHourValue = round2(
      underOneHour.reduce((s, e) => s + (effectiveByGame.get(e.gameId) || 0), 0),
    );

    const salePurchases = purchases.filter((p) => (p.discountPct || 0) > 0);
    const averageDiscount =
      salePurchases.length > 0
        ? salePurchases.reduce((s, p) => s + (p.discountPct || 0), 0) /
          salePurchases.length
        : 0;

    const { byGenreMap, byPublisherMap } = sumGenrePublisherAmounts(
      library,
      effectiveByGame,
    );
    const libraryMix = computeLibraryMix(roiRows);
    const playtimeBuckets = computePlaytimeBuckets(roiRows);
    const { shelfware, unplayedValue } = computeShelfware(
      roiRows,
      COST_SHELFWARE_LIMIT,
    );

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
      underOneHourValue,
      salePurchaseCount: salePurchases.length,
      averageDiscount: round2(averageDiscount),
      totalHours,
      paidGameCount: libraryMix.paid.count,
      freeGameCount: libraryMix.free.count,
      unplayedValue,
      playtimeBuckets,
      libraryMix,
      shelfware,
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

  async roi(
    userId: string,
    opts: {
      page?: number;
      pageSize?: number;
      sort?: CostRoiSort;
      value?: CostRoiValueFilter;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? COST_ROI_PAGE_SIZE;
    const sort = opts.sort ?? "best";
    const value = opts.value ?? "all";

    const { purchases, library } = await this.loadLibraryContext(userId);
    const allRows = buildAllRoiRows(library, purchases);
    const filtered = filterRoiRows(allRows, value);
    const sorted = sortRoiRows(filtered, sort);
    return paginateRoiRows(sorted, page, pageSize);
  }
}
