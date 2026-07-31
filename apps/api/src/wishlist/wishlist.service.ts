import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { parseStringArray } from "../lib/json-arrays";
import { isStoreId, StoreId } from "../stores/store.constants";
import { WISHLIST_PAGE_SIZE } from "./wishlist.constants";

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private where(userId: string, store?: string) {
    const storeFilter =
      store && isStoreId(store) ? (store as StoreId) : undefined;
    return {
      userId,
      ...(storeFilter ? { store: storeFilter } : {}),
    };
  }

  private mapItem(w: {
    id: string;
    store: string;
    externalId: string;
    appId: number | null;
    gameId: string | null;
    name: string | null;
    headerImage: string | null;
    priority: number;
    dateAdded: Date | null;
    targetPrice: number | null;
    currentPrice: number | null;
    lowestPrice: number | null;
    shouldBuyScore: number | null;
    genres: string;
  }) {
    return {
      id: w.id,
      store: (isStoreId(w.store) ? w.store : "steam") as StoreId,
      externalId: w.externalId,
      appId: w.appId,
      gameId: w.gameId,
      name: w.name || `Item ${w.externalId}`,
      headerImage: w.headerImage,
      priority: w.priority,
      dateAdded: w.dateAdded?.toISOString() ?? null,
      targetPrice: w.targetPrice,
      currentPrice: w.currentPrice,
      lowestPrice: w.lowestPrice,
      shouldBuyScore: w.shouldBuyScore,
      genres: parseStringArray(w.genres),
    };
  }

  async list(
    userId: string,
    store?: string,
    opts: { page?: number; pageSize?: number } = {},
  ) {
    const where = this.where(userId, store);
    const take = Math.min(Math.max(opts.pageSize ?? WISHLIST_PAGE_SIZE, 1), 100);
    const safePage = Math.max(opts.page ?? 1, 1);
    const skip = (safePage - 1) * take;

    const [total, rows] = await Promise.all([
      this.prisma.wishlistItem.count({ where }),
      this.prisma.wishlistItem.findMany({
        where,
        orderBy: [{ shouldBuyScore: "desc" }, { priority: "asc" }],
        skip,
        take,
      }),
    ]);

    return {
      total,
      page: safePage,
      pageSize: take,
      items: rows.map((w) => this.mapItem(w)),
    };
  }

  private async listAll(userId: string, store?: string) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: this.where(userId, store),
      orderBy: [{ shouldBuyScore: "desc" }, { priority: "asc" }],
    });
    return rows.map((w) => this.mapItem(w));
  }

  async setTargetPrice(
    userId: string,
    store: string,
    externalId: string,
    targetPrice: number | null,
  ) {
    if (!isStoreId(store)) throw new Error("invalid store");
    return this.prisma.wishlistItem.update({
      where: {
        userId_store_externalId: { userId, store, externalId },
      },
      data: { targetPrice },
    });
  }

  /** Back-compat: Steam appId. */
  async setTargetPriceByAppId(
    userId: string,
    appId: number,
    targetPrice: number | null,
  ) {
    return this.setTargetPrice(userId, "steam", String(appId), targetPrice);
  }

  async recommendations(userId: string) {
    const items = await this.listAll(userId);
    return items
      .filter((i) => (i.shouldBuyScore || 0) >= 50)
      .slice(0, 12)
      .map((i) => ({
        ...i,
        reasons: this.explainScore(i),
      }));
  }

  async dealAlerts(userId: string) {
    const items = await this.listAll(userId);
    const alerts: {
      store: StoreId;
      externalId: string;
      appId: number | null;
      name: string;
      headerImage: string | null;
      currentPrice: number | null;
      lowestPrice: number | null;
      targetPrice: number | null;
      shouldBuyScore: number | null;
      reason: "target" | "historical_low" | "strong_score";
    }[] = [];

    for (const i of items) {
      if (i.currentPrice == null) continue;
      if (i.targetPrice != null && i.currentPrice <= i.targetPrice) {
        alerts.push({ ...this.alertFields(i), reason: "target" });
      } else if (
        i.lowestPrice != null &&
        i.currentPrice <= i.lowestPrice * 1.05
      ) {
        alerts.push({ ...this.alertFields(i), reason: "historical_low" });
      } else if ((i.shouldBuyScore || 0) >= 75) {
        alerts.push({ ...this.alertFields(i), reason: "strong_score" });
      }
    }
    return alerts.slice(0, 20);
  }

  private alertFields(i: {
    store: StoreId;
    externalId: string;
    appId: number | null | undefined;
    name: string;
    headerImage: string | null;
    currentPrice: number | null;
    lowestPrice: number | null;
    targetPrice: number | null;
    shouldBuyScore: number | null;
  }) {
    return {
      store: i.store,
      externalId: i.externalId,
      appId: i.appId ?? null,
      name: i.name,
      headerImage: i.headerImage,
      currentPrice: i.currentPrice,
      lowestPrice: i.lowestPrice,
      targetPrice: i.targetPrice,
      shouldBuyScore: i.shouldBuyScore,
    };
  }

  private explainScore(i: {
    shouldBuyScore: number | null;
    currentPrice: number | null;
    lowestPrice: number | null;
    dateAdded: string | null;
  }) {
    const reasons: string[] = [];
    if (
      i.currentPrice != null &&
      i.lowestPrice != null &&
      i.currentPrice <= i.lowestPrice * 1.1
    ) {
      reasons.push("Near historical low");
    }
    if ((i.shouldBuyScore || 0) >= 70) reasons.push("Strong match for you");
    if (i.dateAdded) {
      const age =
        (Date.now() - new Date(i.dateAdded).getTime()) /
        (1000 * 60 * 60 * 24);
      if (age > 60) reasons.push("On wishlist a while");
    }
    return reasons.length ? reasons : ["Worth watching"];
  }
}
