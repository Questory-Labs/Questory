import type {
  CostRoiPage,
  CostRoiRow,
  CostSummary,
  DealAlert,
  WishlistItem,
} from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import {
  DEMO_CURRENCY,
  LIBRARY_GAMES,
  WISHLIST_GAMES,
  currentPrice,
  gameId,
  metaFor,
  ownedProfile,
  paginate,
  roundHours,
  roundMoney,
  textParam,
} from "./games-catalog";
import { daysAgo, steamHeaderUrl } from "./helpers";

const WISHLIST_PAGE_SIZE = 15;
const ROI_PAGE_SIZE = 20;
const SHELFWARE_LIMIT = 4;

const SCORES: Record<number, { score: number; priority: number; added: number; target: number | null }> = {
  632470: { score: 88, priority: 1, added: 34, target: 15 },
  646570: { score: 91, priority: 2, added: 80, target: 7.5 },
  892970: { score: 72, priority: 3, added: 110, target: 12 },
  728880: { score: 64, priority: 4, added: 150, target: null },
  1426210: { score: 86, priority: 5, added: 30, target: 15 },
};

function reasonsFor(appId: number): string[] {
  const meta = metaFor(appId);
  const reasons: string[] = [];
  if (currentPrice(appId) <= meta.lowest * 1.25) reasons.push("Near historical low");
  if (SCORES[appId].score >= 70) reasons.push("Strong match for you");
  if (meta.discount > 0) reasons.push(`${meta.discount}% off right now`);
  return reasons;
}

export function wishlistItems(): WishlistItem[] {
  return WISHLIST_GAMES.map((game) => {
    const meta = metaFor(game.appId);
    const score = SCORES[game.appId];
    const price = currentPrice(game.appId);
    return {
      id: `demo-wish-${game.appId}`,
      store: "steam" as const,
      externalId: String(game.appId),
      appId: game.appId,
      gameId: gameId(game.appId),
      name: game.name,
      headerImage: steamHeaderUrl(game.appId),
      priority: score.priority,
      dateAdded: daysAgo(score.added),
      targetPrice: score.target,
      currentPrice: price,
      lowestPrice: meta.lowest,
      shouldBuyScore: score.score,
      genres: [...game.genres],
      discountPercent: meta.discount,
      regularPrice: meta.price,
      bestPrice: price,
      bestStore: "steam" as const,
      reasons: reasonsFor(game.appId),
    };
  }).sort((a, b) => a.priority - b.priority);
}

function dealReason(item: WishlistItem): DealAlert["reason"] {
  const price = item.currentPrice ?? 0;
  if (item.targetPrice != null && price <= item.targetPrice) return "target";
  if (item.lowestPrice != null && price <= item.lowestPrice * 1.25) return "historical_low";
  return "strong_score";
}

function wishlistDeals(): DealAlert[] {
  return wishlistItems()
    .filter((item) => (item.discountPercent ?? 0) > 0)
    .map((item) => ({
      store: item.store,
      externalId: item.externalId,
      appId: item.appId,
      name: item.name,
      headerImage: item.headerImage,
      currentPrice: item.currentPrice,
      lowestPrice: item.lowestPrice,
      targetPrice: item.targetPrice,
      shouldBuyScore: item.shouldBuyScore,
      discountPercent: item.discountPercent,
      reason: dealReason(item),
    }));
}

function roiRows(): CostRoiRow[] {
  return LIBRARY_GAMES.map((game) => {
    const amount = ownedProfile(game.appId).paid;
    const hours = roundHours(game.minutes);
    return {
      gameId: gameId(game.appId),
      appId: game.appId,
      name: game.name,
      headerImage: steamHeaderUrl(game.appId),
      stores: ["steam"],
      amount,
      currentPrice: currentPrice(game.appId),
      lowestPrice: metaFor(game.appId).lowest,
      hours,
      costPerHour: hours > 0 ? roundMoney(amount / hours) : null,
      priceSource: "paid" as const,
    };
  });
}

function rankRoi(rows: CostRoiRow[], sort: string): CostRoiRow[] {
  const rank = (row: CostRoiRow) => row.costPerHour ?? Number.POSITIVE_INFINITY;
  return [...rows].sort((a, b) => (sort === "worst" ? rank(b) - rank(a) : rank(a) - rank(b)));
}

function roiPage(query: Record<string, unknown>): CostRoiPage {
  const value = textParam(query.value);
  const rows = value === "free" ? [] : roiRows();
  const { total, page, pageSize, items } = paginate(
    rankRoi(rows, textParam(query.sort)),
    query,
    ROI_PAGE_SIZE,
  );
  return { items, total, page, pageSize };
}

function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return roundMoney(items.reduce((sum, item) => sum + pick(item), 0));
}

function amountsByKey(rows: { key: string; amount: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.key, (totals.get(row.key) ?? 0) + row.amount);
  return [...totals.entries()]
    .map(([key, amount]) => ({ key, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

function playtimeBuckets(rows: CostRoiRow[]) {
  const defs: { name: string; match: (hours: number) => boolean }[] = [
    { name: "Never played", match: (hours) => hours === 0 },
    { name: "Under 1h", match: (hours) => hours > 0 && hours < 1 },
    { name: "1-10h", match: (hours) => hours >= 1 && hours < 10 },
    { name: "10-50h", match: (hours) => hours >= 10 && hours < 50 },
    { name: "50h+", match: (hours) => hours >= 50 },
  ];
  return defs.map(({ name, match }) => {
    const bucket = rows.filter((row) => match(row.hours));
    return { name, amount: sumBy(bucket, (row) => row.amount), count: bucket.length };
  });
}

function costSummary(): CostSummary {
  const rows = roiRows();
  const never = rows.filter((row) => row.hours === 0);
  const spending = sumBy(rows, (row) => row.amount);
  const totalHours = roundMoney(rows.reduce((sum, row) => sum + row.hours, 0));
  const discounted = LIBRARY_GAMES.filter(
    (game) => ownedProfile(game.appId).paid < metaFor(game.appId).price,
  );
  const averageDiscount = Math.round(
    discounted.reduce((sum, game) => {
      const { price } = metaFor(game.appId);
      return sum + ((price - ownedProfile(game.appId).paid) / price) * 100;
    }, 0) / discounted.length,
  );
  const unplayedValue = sumBy(never, (row) => row.amount);
  return {
    lifetimeSpending: spending,
    lifetimeAtCurrent: sumBy(rows, (row) => row.currentPrice ?? 0),
    lifetimeAtLowest: sumBy(rows, (row) => row.lowestPrice ?? 0),
    pricedGameCount: rows.length,
    librarySize: rows.length,
    usingStoreEstimates: false,
    currency: DEMO_CURRENCY,
    costPerHour: roundMoney(spending / totalHours),
    moneyWasted: unplayedValue,
    neverPlayedCount: never.length,
    underOneHourCount: 0,
    underOneHourValue: 0,
    salePurchaseCount: discounted.length,
    averageDiscount,
    totalHours,
    paidGameCount: rows.length,
    freeGameCount: 0,
    unplayedValue,
    playtimeBuckets: playtimeBuckets(rows),
    libraryMix: { paid: { count: rows.length, amount: spending }, free: { count: 0 } },
    shelfware: rankRoi(rows, "worst").slice(0, SHELFWARE_LIMIT),
    byGenre: amountsByKey(
      LIBRARY_GAMES.map((game) => ({
        key: game.genres[0],
        amount: ownedProfile(game.appId).paid,
      })),
    ).map(({ key, amount }) => ({ genre: key, amount })),
    byPublisher: amountsByKey(
      LIBRARY_GAMES.map((game) => ({
        key: metaFor(game.appId).publisher,
        amount: ownedProfile(game.appId).paid,
      })),
    ).map(({ key, amount }) => ({ publisher: key, amount })),
  };
}

export const wishlistCostRoutes: DemoRoute[] = [
  {
    method: "GET",
    pattern: "/wishlist",
    respond: ({ query }) => paginate(wishlistItems(), query, WISHLIST_PAGE_SIZE),
  },
  { method: "GET", pattern: "/wishlist/recommendations", respond: () => wishlistItems() },
  { method: "GET", pattern: "/wishlist/deals", respond: () => wishlistDeals() },
  { method: "GET", pattern: "/cost/summary", respond: () => costSummary() },
  { method: "GET", pattern: "/cost/roi", respond: ({ query }) => roiPage(query) },
];
