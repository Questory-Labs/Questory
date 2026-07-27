import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { resolveDisplayCurrency } from "../lib/currency";
import { parseStringArray } from "../lib/json-arrays";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const [
      user,
      librarySize,
      playAgg,
      unplayedCount,
      wishlistCount,
      activeFriends,
      recentlyPlayed,
      latestSync,
      library,
      wishlist,
      purchase,
      nearCompletionCount,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.libraryEntry.count({ where: { userId, hidden: false } }),
      this.prisma.libraryEntry.aggregate({
        where: { userId },
        _sum: { playtimeForever: true },
      }),
      this.prisma.libraryEntry.count({
        where: { userId, playtimeForever: 0, hidden: false },
      }),
      this.prisma.wishlistItem.count({ where: { userId } }),
      this.prisma.friendship.count({ where: { userId } }),
      this.prisma.libraryEntry.findMany({
        where: { userId, lastPlayedAt: { not: null } },
        orderBy: { lastPlayedAt: "desc" },
        take: 8,
        include: { game: true },
      }),
      // Prefer an in-flight job so dashboard "syncing" isn't stuck on a finished
      // newer row (e.g. metadata-refresh completing while library still runs).
      this.prisma.syncJob.findFirst({
        where: {
          userId,
          status: { in: ["pending", "running"] },
        },
        orderBy: { createdAt: "desc" },
      }).then(async (active) => {
        if (active) return active;
        return this.prisma.syncJob.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
      }),
      this.prisma.libraryEntry.findMany({
        where: { userId, hidden: false },
        include: { game: true },
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        select: {
          currentPrice: true,
          lowestPrice: true,
          targetPrice: true,
        },
      }),
      this.prisma.purchase.findFirst({
        where: { userId },
        select: { currency: true },
      }),
      this.prisma.libraryEntry.count({
        where: {
          userId,
          hidden: false,
          achievementPct: { gte: 80, lt: 100 },
        },
      }),
    ]);

    const totalMinutes = playAgg._sum.playtimeForever || 0;
    const totalHours = totalMinutes / 60;

    let lifetimeAtCurrent = 0;
    for (const e of library) {
      if (e.pricePaid != null) lifetimeAtCurrent += e.pricePaid;
      else if (e.game.isFree) lifetimeAtCurrent += 0;
      else if (e.game.currentPrice != null) lifetimeAtCurrent += e.game.currentPrice;
    }

    const dealSignals = wishlist.filter((w) => {
      if (w.currentPrice == null) return false;
      if (w.targetPrice != null && w.currentPrice <= w.targetPrice) return true;
      if (w.lowestPrice != null && w.currentPrice <= w.lowestPrice * 1.05) {
        return true;
      }
      return false;
    }).length;

    const storeCurrency = library.find(
      (e) => e.game.priceCurrency,
    )?.game.priceCurrency;

    return {
      librarySize,
      totalPlaytimeHours: Math.round(totalHours * 10) / 10,
      unplayedCount,
      wishlistCount,
      activeFriends,
      nearCompletionCount,
      currentSalesCount: dealSignals,
      currency: resolveDisplayCurrency({
        priceCurrency: storeCurrency,
        purchaseCurrency: purchase?.currency,
        countryCode: user?.countryCode,
      }),
      costPerHour:
        totalHours > 0
          ? Math.round((lifetimeAtCurrent / totalHours) * 100) / 100
          : lifetimeAtCurrent > 0
            ? Math.round(lifetimeAtCurrent * 100) / 100
            : null,
      lifetimeAtCurrent: Math.round(lifetimeAtCurrent * 100) / 100,
      recentlyPlayed: recentlyPlayed.map((e) => ({
        appId: e.game.appId,
        name: e.game.name,
        headerImage: e.game.headerImage,
        playtimeForever: e.playtimeForever,
        lastPlayedAt: e.lastPlayedAt?.toISOString() ?? null,
      })),
      syncStatus: latestSync
        ? {
            status: latestSync.status as
              | "pending"
              | "running"
              | "completed"
              | "failed",
            type: latestSync.type,
            error: latestSync.error,
            finishedAt: latestSync.finishedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  /** Weekly play-next ranking from backlog + affinity + Deck/review signals. */
  async playNext(userId: string, limit = 12) {
    const library = await this.prisma.libraryEntry.findMany({
      where: { userId, hidden: false },
      include: { game: true },
    });

    const genreAffinity = new Map<string, number>();
    for (const e of library) {
      const weight = Math.log10((e.playtimeForever || 0) / 60 + 1) + 1;
      for (const g of parseStringArray(e.game.genres)) {
        genreAffinity.set(g, (genreAffinity.get(g) || 0) + weight);
      }
    }

    const candidates = library.filter((e) => {
      const hours = e.playtimeForever / 60;
      // Unplayed or lightly started backlog
      return hours < 8;
    });

    const scored = candidates.map((e) => {
      const genres = parseStringArray(e.game.genres);
      const reasons: string[] = [];
      let score = 0;

      const affinity = genres.reduce(
        (s, g) => s + (genreAffinity.get(g) || 0),
        0,
      );
      if (affinity > 0) {
        score += Math.min(40, affinity * 4);
        reasons.push("Matches genres you play");
      }

      if (e.playtimeForever === 0) {
        score += 18;
        reasons.push("Never played");
      } else if (e.playtimeForever < 120) {
        score += 12;
        reasons.push("Barely started");
      }

      if (e.game.deckStatus === "verified" || e.game.deckStatus === "playable") {
        score += 10;
        reasons.push("Deck ready");
      }

      if (e.game.reviewScore != null && e.game.reviewScore >= 75) {
        score += 12;
        reasons.push("Well reviewed");
      } else if (e.game.reviewScore != null && e.game.reviewScore >= 60) {
        score += 6;
      }

      const monthsSince =
        e.lastPlayedAt != null
          ? (Date.now() - e.lastPlayedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
          : 999;
      if (monthsSince >= 12 && e.playtimeForever > 0) {
        score += 14;
        reasons.push("Forgotten gem");
      }

      if (e.achievementPct != null && e.achievementPct >= 80) {
        score += 20;
        reasons.push("Near completion");
      }

      // Prefer shorter sessions when unplayed
      if (e.playtimeForever === 0 && genres.some((g) => /indie|casual|puzzle/i.test(g))) {
        score += 6;
        reasons.push("Easy to dive into");
      }

      return {
        appId: e.game.appId,
        name: e.game.name,
        headerImage: e.game.headerImage,
        playtimeForever: e.playtimeForever,
        lastPlayedAt: e.lastPlayedAt?.toISOString() ?? null,
        score: Math.round(score * 10) / 10,
        reasons: reasons.slice(0, 3),
        deckStatus: e.game.deckStatus,
        genres,
      };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
