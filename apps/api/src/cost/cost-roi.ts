import { parseStringArray } from "../lib/json-arrays";
import { isStoreId, StoreId } from "../stores/store.constants";

type LibraryEntry = {
  gameId: string;
  pricePaid: number | null;
  playtimeForever: number;
  game: {
    appId: number | null;
    name: string;
    headerImage: string | null;
    isFree: boolean;
    currentPrice: number | null;
    lowestPrice: number | null;
    genres?: string | null;
    publishers?: string | null;
  };
  ownerships: Array<{
    store: string;
    listing: {
      isFree: boolean;
      currentPrice: number | null;
      lowestPrice: number | null;
    } | null;
  }>;
};

type Purchase = {
  gameId: string | null;
  appId: number | null;
  amount: number;
};

export type CostRoiRowData = {
  gameId: string;
  appId: number | null;
  name: string;
  headerImage: string | null;
  stores: StoreId[];
  amount: number;
  currentPrice: number | null;
  lowestPrice: number | null;
  hours: number;
  costPerHour: number | null;
  priceSource: "paid" | "store";
};

export type CostRoiSort = "best" | "worst";
export type CostRoiValueFilter = "paid" | "free" | "all";

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function buildPaidByGame(library: LibraryEntry[], purchases: Purchase[]) {
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
  return paidByGame;
}

export function buildRoiRow(
  entry: LibraryEntry,
  paidByGame: Map<string, number>,
): CostRoiRowData | null {
  const paid = paidByGame.get(entry.gameId);
  const ownedListingPrices = entry.ownerships
    .map((o) => o.listing)
    .filter((l): l is NonNullable<typeof l> => l != null)
    .map((l) => (l.isFree ? 0 : l.currentPrice))
    .filter((p): p is number => p != null);
  const current =
    ownedListingPrices.length > 0
      ? Math.min(...ownedListingPrices)
      : entry.game.isFree
        ? 0
        : entry.game.currentPrice != null
          ? entry.game.currentPrice
          : null;
  const ownedLows = entry.ownerships
    .map((o) => o.listing)
    .filter((l): l is NonNullable<typeof l> => l != null)
    .map((l) => (l.isFree ? 0 : (l.lowestPrice ?? l.currentPrice)))
    .filter((p): p is number => p != null);
  const lowest =
    ownedLows.length > 0
      ? Math.min(...ownedLows)
      : entry.game.isFree
        ? 0
        : entry.game.lowestPrice != null
          ? entry.game.lowestPrice
          : current;
  const amount = paid ?? current;
  if (amount == null) return null;
  const hours = entry.playtimeForever / 60;
  const stores = [
    ...new Set(entry.ownerships.map((o) => o.store).filter(isStoreId)),
  ] as StoreId[];
  return {
    gameId: entry.gameId,
    appId: entry.game.appId,
    name: entry.game.name,
    headerImage: entry.game.headerImage,
    stores,
    amount: round2(amount),
    currentPrice: current != null ? round2(current) : null,
    lowestPrice: lowest != null ? round2(lowest) : null,
    hours: round2(hours),
    costPerHour: hours > 0 ? round2(amount / hours) : null,
    priceSource: paid != null ? "paid" : "store",
  };
}

export function buildAllRoiRows(
  library: LibraryEntry[],
  purchases: Purchase[],
): CostRoiRowData[] {
  const paidByGame = buildPaidByGame(library, purchases);
  return library
    .map((entry) => buildRoiRow(entry, paidByGame))
    .filter((row): row is CostRoiRowData => row != null);
}

export function filterRoiRows(
  rows: CostRoiRowData[],
  value: CostRoiValueFilter,
) {
  const ranked = rows.filter((r) => r.costPerHour != null);
  if (value === "paid") return ranked.filter((r) => r.amount > 0);
  if (value === "free") return ranked.filter((r) => r.amount === 0);
  return ranked;
}

export function sortRoiRows(rows: CostRoiRowData[], sort: CostRoiSort) {
  return [...rows].sort((a, b) => {
    if (a.costPerHour == null) return 1;
    if (b.costPerHour == null) return -1;
    return sort === "worst"
      ? b.costPerHour - a.costPerHour
      : a.costPerHour - b.costPerHour;
  });
}

export function paginateRoiRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
) {
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export function computePlaytimeBuckets(rows: CostRoiRowData[]) {
  const paid = rows.filter((r) => r.amount > 0);
  const buckets = [
    bucket(paid, "Unplayed", (h) => h === 0),
    bucket(paid, "< 1h", (h) => h > 0 && h < 1),
    bucket(paid, "1–10h", (h) => h >= 1 && h < 10),
    bucket(paid, "10–50h", (h) => h >= 10 && h < 50),
    bucket(paid, "50h+", (h) => h >= 50),
  ];
  return buckets.filter((b) => b.amount > 0 || b.count > 0);
}

export function computeLibraryMix(rows: CostRoiRowData[]) {
  const paid = rows.filter((r) => r.amount > 0);
  const free = rows.filter((r) => r.amount === 0);
  return {
    paid: {
      count: paid.length,
      amount: round2(paid.reduce((sum, r) => sum + r.amount, 0)),
    },
    free: { count: free.length },
  };
}

export function computeShelfware(rows: CostRoiRowData[], limit: number) {
  const unplayedValue = round2(
    rows
      .filter((r) => r.amount > 0 && r.hours === 0)
      .reduce((sum, r) => sum + r.amount, 0),
  );
  const shelfware = rows
    .filter((r) => r.amount > 0 && r.hours === 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
  return { shelfware, unplayedValue };
}

export function sumGenrePublisherAmounts(
  library: LibraryEntry[],
  effectiveByGame: Map<string, number>,
) {
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
  return { byGenreMap, byPublisherMap };
}

function bucket(
  rows: CostRoiRowData[],
  name: string,
  pred: (hours: number) => boolean,
) {
  const matched = rows.filter((r) => pred(r.hours));
  return {
    name,
    amount: round2(matched.reduce((sum, r) => sum + r.amount, 0)),
    count: matched.length,
  };
}
