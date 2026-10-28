import { Injectable } from "@nestjs/common";
import type { NavCounts } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import {
  NAV_COUNTS_CACHE_TTL_SEC,
  NAV_COUNTS_DISTINCT_CAP,
} from "./shell-nav-counts.constants";

@Injectable()
export class ShellNavCountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getCounts(userId: string): Promise<NavCounts> {
    const key = `shell:nav-counts:${userId}`;
    const cached = await this.cache.getJson<NavCounts>(key);
    if (cached) return cached;

    const now = new Date();
    const [
      library,
      wishlist,
      musicListens,
      watchTitles,
      readTitles,
      activeGoals,
      sourceConnections,
      accounts,
    ] = await Promise.all([
      this.prisma.libraryEntry.count({ where: { userId } }),
      this.prisma.wishlistItem.count({ where: { userId } }),
      this.prisma.listen.count({ where: { userId } }),
      this.prisma.watchEvent
        .findMany({
          where: { userId },
          select: { titleId: true },
          distinct: ["titleId"],
          take: NAV_COUNTS_DISTINCT_CAP,
        })
        .then((r) => r.length),
      this.prisma.readEvent
        .findMany({
          where: { userId },
          select: { readTitleId: true },
          distinct: ["readTitleId"],
          take: NAV_COUNTS_DISTINCT_CAP,
        })
        .then((r) => r.length),
      this.prisma.goal.count({
        where: { userId, doneAt: null, periodEnd: { gte: now } },
      }),
      this.prisma.sourceConnection.count({ where: { userId } }),
      this.prisma.account.count({ where: { userId } }),
    ]);

    const counts: NavCounts = {
      library,
      wishlist,
      musicListens,
      watchTitles,
      readTitles,
      activeGoals,
      connectedSources: sourceConnections + accounts,
    };
    await this.cache.setJson(key, counts, NAV_COUNTS_CACHE_TTL_SEC);
    return counts;
  }
}
