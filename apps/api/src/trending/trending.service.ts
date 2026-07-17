import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import {
  SteamApiService,
  type ChartRank,
} from "../steam/steam-api.service";
import type {
  TrendingGame,
  TrendingResponse,
  TrendingShelf,
} from "@questorylabs/shared";

/** Cap how many friends we hit Steam for on a single trending build. */
const MAX_FRIENDS = 200;
/** Parallel Steam recently-played fetches. */
const FRIEND_CONCURRENCY = 4;
/** Delay between launching friend fetches (rate-limit cushion). */
const FRIEND_STAGGER_MS = 180;
/** Games pulled per friend from GetRecentlyPlayedGames. */
const RECENT_PER_FRIEND = 12;
/** Aggregate friends shelf cache. */
const FRIENDS_CACHE_TTL = 1200;
/** How many friends shown as avatars on a tile. */
const SAMPLE_FRIENDS = 3;
const FRIENDS_TOP_N = 16;
const GLOBAL_TOP_N = 20;
const CHART_TOP_N = 20;

type FriendAgg = {
  appId: number;
  name: string;
  headerImage: string | null;
  friendCount: number;
  totalPlaytimeMinutes: number;
  sampleFriends: {
    steamId: string;
    personaName: string;
    avatarUrl: string | null;
  }[];
};

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly cache: CacheService,
  ) {}

  async getTrending(userId: string): Promise<TrendingResponse> {
    const [friends, global, concurrent, deck, topReleases] = await Promise.all([
      this.getFriendsShelf(userId),
      this.getGlobalShelf(),
      this.getConcurrentShelf(),
      this.getDeckShelf(),
      this.getTopReleasesShelf(),
    ]);
    return { friends, global, concurrent, deck, topReleases };
  }

  async getFriendsShelf(
    userId: string,
  ): Promise<TrendingResponse["friends"]> {
    const cacheKey = `trending:friends:v1:${userId}`;
    const cached =
      await this.cache.getJson<TrendingResponse["friends"]>(cacheKey);
    if (cached) {
      return {
        ...cached,
        meta: { ...cached.meta, cached: true },
      };
    }

    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      orderBy: { personaName: "asc" },
    });

    const friendsTotal = friendships.length;
    const truncated = friendsTotal > MAX_FRIENDS;
    const sample = friendships.slice(0, MAX_FRIENDS);

    const byApp = new Map<number, FriendAgg>();
    let friendsWithData = 0;
    let friendsFailed = 0;

    for (let i = 0; i < sample.length; i += FRIEND_CONCURRENCY) {
      const chunk = sample.slice(i, i + FRIEND_CONCURRENCY);
      await Promise.all(
        chunk.map(async (friend) => {
          try {
            const games = await this.steam.getRecentlyPlayedGames(
              friend.friendSteamId,
              RECENT_PER_FRIEND,
            );
            if (!games.length) return;

            let contributed = false;
            for (const g of games) {
              const minutes = g.playtime_2weeks ?? 0;
              if (minutes <= 0 && !g.rtime_last_played) continue;
              const playMinutes = minutes > 0 ? minutes : 1;
              contributed = true;

              let agg = byApp.get(g.appid);
              if (!agg) {
                agg = {
                  appId: g.appid,
                  name: g.name || `App ${g.appid}`,
                  headerImage: this.steam.headerImageFromAppId(g.appid),
                  friendCount: 0,
                  totalPlaytimeMinutes: 0,
                  sampleFriends: [],
                };
                byApp.set(g.appid, agg);
              } else if (g.name && agg.name.startsWith("App ")) {
                agg.name = g.name;
              }

              agg.friendCount += 1;
              agg.totalPlaytimeMinutes += playMinutes;
              if (agg.sampleFriends.length < SAMPLE_FRIENDS) {
                agg.sampleFriends.push({
                  steamId: friend.friendSteamId,
                  personaName: friend.personaName,
                  avatarUrl: friend.avatarUrl,
                });
              }
            }
            if (contributed) friendsWithData += 1;
          } catch (err) {
            friendsFailed += 1;
            this.logger.warn(
              `Friends trending skip ${friend.friendSteamId}: ${err}`,
            );
          }
        }),
      );
      if (i + FRIEND_CONCURRENCY < sample.length) {
        await new Promise((r) => setTimeout(r, FRIEND_STAGGER_MS));
      }
    }

    const games: TrendingGame[] = [...byApp.values()]
      .sort((a, b) => {
        if (b.friendCount !== a.friendCount) {
          return b.friendCount - a.friendCount;
        }
        return b.totalPlaytimeMinutes - a.totalPlaytimeMinutes;
      })
      .slice(0, FRIENDS_TOP_N)
      .map((g) => ({
        appId: g.appId,
        name: g.name,
        headerImage: g.headerImage,
        friendCount: g.friendCount,
        totalPlaytimeMinutes: g.totalPlaytimeMinutes,
        sampleFriends: g.sampleFriends,
      }));

    const result: TrendingResponse["friends"] = {
      games,
      meta: {
        friendsTotal,
        friendsSampled: sample.length,
        friendsWithData,
        friendsFailed,
        cached: false,
        truncated,
        windowDays: 14,
      },
    };

    await this.cache.setJson(cacheKey, result, FRIENDS_CACHE_TTL);
    return result;
  }

  async getGlobalShelf(): Promise<TrendingResponse["global"]> {
    const cacheKey = "trending:global:v2";
    const cached =
      await this.cache.getJson<TrendingResponse["global"]>(cacheKey);
    if (cached) return cached;

    const chart = await this.steam.getMostPlayedGames(GLOBAL_TOP_N);
    const games = await this.resolveChartGames(chart.ranks, {
      includePeak: true,
      includeRankChange: true,
    });

    const result: TrendingResponse["global"] = {
      games,
      meta: {
        rollupDate: chart.rollupDate
          ? new Date(chart.rollupDate * 1000).toISOString()
          : null,
        source: "steam_charts",
      },
    };

    await this.cache.setJson(cacheKey, result, 1800);
    return result;
  }

  async getConcurrentShelf(): Promise<TrendingShelf> {
    const cacheKey = "trending:concurrent:v1";
    const cached = await this.cache.getJson<TrendingShelf>(cacheKey);
    if (cached) return cached;

    const chart = await this.steam.getGamesByConcurrentPlayers(CHART_TOP_N);
    const games = await this.resolveChartGames(chart.ranks, {
      includePeak: true,
      includeConcurrent: true,
    });

    const result: TrendingShelf = {
      games,
      meta: {
        lastUpdate: chart.lastUpdate
          ? new Date(chart.lastUpdate * 1000).toISOString()
          : null,
        source: "steam_charts_concurrent",
      },
    };
    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async getDeckShelf(): Promise<TrendingShelf> {
    const cacheKey = "trending:deck:v1";
    const cached = await this.cache.getJson<TrendingShelf>(cacheKey);
    if (cached) return cached;

    const chart = await this.steam.getMostPlayedSteamDeckGames(CHART_TOP_N);
    const games = await this.resolveChartGames(chart.ranks, {
      includeRankChange: true,
    });

    const result: TrendingShelf = {
      games,
      meta: {
        period: chart.period,
        source: "steam_charts_deck",
      },
    };
    await this.cache.setJson(cacheKey, result, 1800);
    return result;
  }

  async getTopReleasesShelf(): Promise<TrendingShelf> {
    const cacheKey = "trending:topreleases:v1";
    const cached = await this.cache.getJson<TrendingShelf>(cacheKey);
    if (cached) return cached;

    const pages = await this.steam.getTopReleasesPages();
    const page = pages[0];
    if (!page) {
      return {
        games: [],
        meta: { pageName: null, source: "steam_charts_top_releases" },
      };
    }

    const ranks: ChartRank[] = page.appIds
      .slice(0, CHART_TOP_N)
      .map((appId, i) => ({
        rank: i + 1,
        appId,
        lastWeekRank: null,
        peakInGame: 0,
      }));
    const games = await this.resolveChartGames(ranks);

    const result: TrendingShelf = {
      games,
      meta: {
        pageName: page.name,
        rollupDate: page.startOfMonth
          ? new Date(page.startOfMonth * 1000).toISOString()
          : null,
        source: "steam_charts_top_releases",
      },
    };
    await this.cache.setJson(cacheKey, result, 3600);
    return result;
  }

  private async resolveChartGames(
    ranks: ChartRank[],
    opts?: {
      includePeak?: boolean;
      includeConcurrent?: boolean;
      includeRankChange?: boolean;
    },
  ): Promise<TrendingGame[]> {
    const appIds = ranks.map((r) => r.appId);
    const dbGames = appIds.length
      ? await this.prisma.game.findMany({
          where: { appId: { in: appIds } },
          select: { appId: true, name: true, headerImage: true },
        })
      : [];
    const dbByApp = new Map(
      dbGames
        .filter((g) => g.appId != null)
        .map((g) => [g.appId as number, g]),
    );

    const missing = appIds.filter((id) => !dbByApp.get(id)?.name);
    const storeItems =
      missing.length > 0
        ? await this.steam.getStoreItems(missing.slice(0, 40))
        : new Map();

    const games: TrendingGame[] = [];
    for (const row of ranks) {
      const fromDb = dbByApp.get(row.appId);
      const fromStore = storeItems.get(row.appId);
      let name = fromDb?.name || fromStore?.name || null;
      let headerImage =
        fromDb?.headerImage ||
        fromStore?.headerImage ||
        this.steam.headerImageFromAppId(row.appId);

      if (!name) {
        try {
          const details = await this.steam.getAppDetails(row.appId);
          name = details?.name || `App ${row.appId}`;
          if (details?.header_image) headerImage = details.header_image;
          await new Promise((r) => setTimeout(r, 80));
        } catch {
          name = `App ${row.appId}`;
        }
      }

      const rankChange =
        opts?.includeRankChange && row.lastWeekRank != null
          ? row.lastWeekRank - row.rank
          : null;

      games.push({
        appId: row.appId,
        name,
        headerImage,
        rank: row.rank,
        ...(opts?.includePeak ? { peakPlayers: row.peakInGame } : {}),
        ...(opts?.includeConcurrent && row.concurrentInGame != null
          ? { concurrentPlayers: row.concurrentInGame }
          : {}),
        ...(rankChange != null ? { rankChange } : { rankChange: null }),
      });
    }
    return games;
  }
}
