import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";

export type SteamOwnedGame = {
  appid: number;
  name?: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  rtime_last_played?: number;
  img_icon_url?: string;
};

export type SteamPlayerSummary = {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatarfull: string;
  loccountrycode?: string;
};

export type SteamFriend = {
  steamid: string;
  relationship: string;
  friend_since: number;
};

export type StoreAppDetails = {
  name: string;
  header_image?: string;
  release_date?: { date?: string };
  genres?: { description: string }[];
  categories?: { description: string }[];
  developers?: string[];
  publishers?: string[];
  is_free?: boolean;
  price_overview?: {
    final: number;
    initial: number;
    discount_percent: number;
    currency: string;
  };
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  packages?: number[];
  dlc?: number[];
};

export type ChartRank = {
  rank: number;
  appId: number;
  lastWeekRank: number | null;
  peakInGame: number;
  concurrentInGame?: number;
};

export type StoreBrowseItem = {
  appId: number;
  name: string;
  isFree: boolean;
  shortDescription: string | null;
  developers: string[];
  publishers: string[];
  tagIds: number[];
  tagNames: string[];
  headerImage: string | null;
  libraryCapsule: string | null;
  reviewScore: number | null;
  reviewDescription: string | null;
  percentPositive: number | null;
  totalReviews: number;
};

export type SteamNewsItem = {
  gid: string;
  title: string;
  url: string;
  contents: string;
  date: number;
  feedLabel: string;
  author: string;
  tags: string[];
};

export type SteamAchievementSchema = {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  iconGray: string;
  hidden: boolean;
};

export type SteamDlcItem = {
  appId: number;
  name: string;
  headerImage: string | null;
  finalPrice: number | null;
  currency: string | null;
  discountPercent: number;
};

export type SteamPackageDetails = {
  packageId: number;
  name: string;
  headerImage: string | null;
  apps: { id: number; name: string }[];
  price: {
    currency: string;
    initial: number;
    final: number;
    discountPercent: number;
  } | null;
};

export type SteamCatalogApp = {
  appId: number;
  name: string;
  lastModified: number | null;
  priceChangeNumber: number | null;
};

@Injectable()
export class SteamApiService {
  private readonly logger = new Logger(SteamApiService.name);
  private readonly base = "https://api.steampowered.com";

  constructor(private readonly cache: CacheService) {}

  private get apiKey() {
    return (process.env.STEAM_API_KEY || "").trim();
  }

  private storeHeaders(): HeadersInit {
    return {
      Accept: "application/json",
      "User-Agent": "QuestoryLabs/1.0",
    };
  }

  private serviceUrl(
    iface: string,
    method: string,
    inputJson?: Record<string, unknown>,
  ): string {
    const params = new URLSearchParams();
    if (this.apiKey) params.set("key", this.apiKey);
    if (inputJson) params.set("input_json", JSON.stringify(inputJson));
    const qs = params.toString();
    return `${this.base}/${iface}/${method}/v1/${qs ? `?${qs}` : ""}`;
  }

  private assetUrl(
    format: string | undefined,
    filename: string | undefined,
  ): string | null {
    if (!format || !filename) return null;
    return `https://shared.akamai.steamstatic.com/store_item_assets/${format.replace(
      "${FILENAME}",
      filename,
    )}`;
  }

  private async fetchJson<T>(
    url: string,
    cacheKey?: string,
    ttl = 300,
    init?: RequestInit,
  ): Promise<T> {
    if (cacheKey) {
      const cached = await this.cache.getJson<T>(cacheKey);
      if (cached) return cached;
    }
    const res = await fetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Steam API ${res.status}: ${text.slice(0, 200)}`);
    }
    if (text.trimStart().startsWith("<")) {
      throw new Error("Steam returned HTML instead of JSON");
    }
    const data = JSON.parse(text) as T;
    if (cacheKey) await this.cache.setJson(cacheKey, data, ttl);
    return data;
  }

  async getPlayerSummaries(steamIds: string[]): Promise<SteamPlayerSummary[]> {
    if (!steamIds.length) return [];
    if (!this.apiKey) {
      this.logger.warn("STEAM_API_KEY missing — returning empty summaries");
      return [];
    }
    const unique = [...new Set(steamIds.filter(Boolean))];
    const players: SteamPlayerSummary[] = [];
    for (let i = 0; i < unique.length; i += 100) {
      const chunk = unique.slice(i, i + 100);
      const ids = chunk.join(",");
      const data = await this.fetchJson<{
        response: { players: SteamPlayerSummary[] };
      }>(
        `${this.base}/ISteamUser/GetPlayerSummaries/v2/?key=${this.apiKey}&steamids=${ids}`,
        `steam:summaries:${ids}`,
        120,
      );
      players.push(...(data.response?.players || []));
    }
    return players;
  }

  async getOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
    if (!this.apiKey) {
      this.logger.warn("STEAM_API_KEY missing — skipping owned games");
      return [];
    }
    const data = await this.fetchJson<{
      response: { games?: SteamOwnedGame[] };
    }>(
      `${this.base}/IPlayerService/GetOwnedGames/v1/?key=${this.apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`,
      `steam:owned:${steamId}`,
      180,
    );
    return data.response?.games || [];
  }

  async getRecentlyPlayedGames(
    steamId: string,
    count = 8,
  ): Promise<SteamOwnedGame[]> {
    if (!this.apiKey) return [];
    try {
      const data = await this.fetchJson<{
        response: { games?: SteamOwnedGame[] };
      }>(
        `${this.base}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${this.apiKey}&steamid=${steamId}&count=${count}`,
        `steam:recent:${steamId}:${count}`,
        600,
      );
      return data.response?.games || [];
    } catch (err) {
      this.logger.warn(`Recently played unavailable for ${steamId}: ${err}`);
      return [];
    }
  }

  /**
   * Steam Charts "Most Played" weekly rollup (same source as
   * https://store.steampowered.com/charts/). No API key required.
   */
  async getMostPlayedGames(limit = 24): Promise<{
    rollupDate: number | null;
    ranks: ChartRank[];
  }> {
    const count = Math.min(100, Math.max(1, limit));
    try {
      const data = await this.fetchJson<{
        response?: {
          rollup_date?: number;
          ranks?: {
            rank: number;
            appid: number;
            last_week_rank?: number;
            peak_in_game?: number;
          }[];
        };
      }>(
        `${this.base}/ISteamChartsService/GetMostPlayedGames/v1/`,
        "steam:charts:mostplayed",
        1800,
      );
      const ranks = (data.response?.ranks || [])
        .slice(0, count)
        .map((r) => ({
          rank: r.rank,
          appId: r.appid,
          lastWeekRank:
            typeof r.last_week_rank === "number" ? r.last_week_rank : null,
          peakInGame: r.peak_in_game || 0,
        }));
      return {
        rollupDate: data.response?.rollup_date ?? null,
        ranks,
      };
    } catch (err) {
      this.logger.warn(`Most played charts failed: ${err}`);
      return { rollupDate: null, ranks: [] };
    }
  }

  /** Live concurrent-player ranking (Steam Charts "playing now"). */
  async getGamesByConcurrentPlayers(limit = 24): Promise<{
    lastUpdate: number | null;
    ranks: ChartRank[];
  }> {
    const count = Math.min(100, Math.max(1, limit));
    try {
      const data = await this.fetchJson<{
        response?: {
          last_update?: number;
          ranks?: {
            rank: number;
            appid: number;
            concurrent_in_game?: number;
            peak_in_game?: number;
          }[];
        };
      }>(
        `${this.base}/ISteamChartsService/GetGamesByConcurrentPlayers/v1/`,
        "steam:charts:concurrent",
        300,
      );
      const ranks = (data.response?.ranks || []).slice(0, count).map((r) => ({
        rank: r.rank,
        appId: r.appid,
        lastWeekRank: null,
        peakInGame: r.peak_in_game || 0,
        concurrentInGame: r.concurrent_in_game || 0,
      }));
      return {
        lastUpdate: data.response?.last_update ?? null,
        ranks,
      };
    } catch (err) {
      this.logger.warn(`Concurrent charts failed: ${err}`);
      return { lastUpdate: null, ranks: [] };
    }
  }

  /**
   * Steam Deck most-played chart.
   * top_played_period: 0 = week?, 1 = observed working period in practice.
   */
  async getMostPlayedSteamDeckGames(
    limit = 24,
    topPlayedPeriod = 1,
  ): Promise<{
    period: number | null;
    ranks: ChartRank[];
  }> {
    const count = Math.min(100, Math.max(1, limit));
    try {
      const data = await this.fetchJson<{
        response?: {
          top_played_period?: number;
          ranks?: {
            rank: number;
            appid: number;
            last_period_rank?: number;
            peak_in_game?: number;
          }[];
        };
      }>(
        this.serviceUrl("ISteamChartsService", "GetMostPlayedSteamDeckGames", {
          count,
          top_played_period: topPlayedPeriod,
        }),
        `steam:charts:deck:${topPlayedPeriod}:${count}`,
        1800,
      );
      const ranks = (data.response?.ranks || []).map((r) => ({
        rank: r.rank,
        appId: r.appid,
        lastWeekRank:
          typeof r.last_period_rank === "number" ? r.last_period_rank : null,
        peakInGame: r.peak_in_game || 0,
      }));
      return {
        period: data.response?.top_played_period ?? topPlayedPeriod,
        ranks,
      };
    } catch (err) {
      this.logger.warn(`Steam Deck charts failed: ${err}`);
      return { period: null, ranks: [] };
    }
  }

  /** Curated monthly top-release chart pages from Steam Charts. */
  async getTopReleasesPages(): Promise<
    {
      name: string;
      startOfMonth: number;
      urlPath: string;
      appIds: number[];
    }[]
  > {
    try {
      const data = await this.fetchJson<{
        response?: {
          pages?: {
            name?: string;
            start_of_month?: number;
            url_path?: string;
            item_ids?: { appid?: number }[];
          }[];
        };
      }>(
        `${this.base}/ISteamChartsService/GetTopReleasesPages/v1/`,
        "steam:charts:topreleasespages",
        3600,
      );
      return (data.response?.pages || [])
        .map((p) => ({
          name: p.name || "Top Releases",
          startOfMonth: p.start_of_month || 0,
          urlPath: p.url_path || "",
          appIds: (p.item_ids || [])
            .map((i) => i.appid)
            .filter((id): id is number => typeof id === "number" && id > 0),
        }))
        .filter((p) => p.appIds.length > 0);
    } catch (err) {
      this.logger.warn(`Top releases pages failed: ${err}`);
      return [];
    }
  }

  async getYearTopAppReleases(
    year = new Date().getUTCFullYear(),
    limit = 24,
  ): Promise<{ appId: number; releaseAt: number; rank: number }[]> {
    const rtimeYear = Math.floor(Date.UTC(year, 0, 1) / 1000);
    try {
      const data = await this.fetchJson<{
        response?: {
          top_combined_app_and_dlc_releases?: {
            appid: number;
            rtime_release?: number;
            app_release_rank?: number;
          }[];
        };
      }>(
        this.serviceUrl("ISteamChartsService", "GetYearTopAppReleases", {
          rtime_year: rtimeYear,
          include_dlc: false,
        }),
        `steam:charts:year:${year}`,
        3600,
      );
      return (data.response?.top_combined_app_and_dlc_releases || [])
        .slice(0, limit)
        .map((r) => ({
          appId: r.appid,
          releaseAt: r.rtime_release || 0,
          rank: r.app_release_rank || 0,
        }))
        .filter((r) => r.appId > 0);
    } catch (err) {
      this.logger.warn(`Year top releases failed: ${err}`);
      return [];
    }
  }

  async getPlayerAchievements(
    steamId: string,
    appId: number,
  ): Promise<{ unlocked: number; total: number; pct: number } | null> {
    if (!this.apiKey) return null;
    try {
      const data = await this.fetchJson<{
        playerstats?: {
          success?: boolean;
          achievements?: { achieved: number }[];
        };
      }>(
        `${this.base}/ISteamUserStats/GetPlayerAchievements/v1/?key=${this.apiKey}&steamid=${steamId}&appid=${appId}`,
        `steam:achievements:${steamId}:${appId}`,
        3600,
      );
      const list = data.playerstats?.achievements;
      if (!data.playerstats?.success || !list?.length) return null;
      const unlocked = list.filter((a) => a.achieved === 1).length;
      const total = list.length;
      const pct = total > 0 ? Math.round((unlocked / total) * 1000) / 10 : 0;
      return { unlocked, total, pct };
    } catch {
      return null;
    }
  }

  async getFriendList(steamId: string): Promise<SteamFriend[]> {
    if (!this.apiKey) return [];
    try {
      const data = await this.fetchJson<{
        friendslist?: { friends: SteamFriend[] };
      }>(
        `${this.base}/ISteamUser/GetFriendList/v1/?key=${this.apiKey}&steamid=${steamId}&relationship=friend`,
        `steam:friends:${steamId}`,
        300,
      );
      return data.friendslist?.friends || [];
    } catch (err) {
      this.logger.warn(`Friend list private/unavailable for ${steamId}: ${err}`);
      return [];
    }
  }

  async getWishlist(steamId: string): Promise<
    { appId: number; priority: number; dateAdded: Date | null }[]
  > {
    // Preferred: official Web API (old store wishlistdata often returns HTML now)
    if (this.apiKey) {
      try {
        const data = await this.fetchJson<{
          response?: {
            items?: { appid: number; priority?: number; date_added?: number }[];
          };
        }>(
          `${this.base}/IWishlistService/GetWishlist/v1/?key=${this.apiKey}&steamid=${steamId}`,
          `steam:wishlist:api:${steamId}`,
          300,
        );
        const items = data.response?.items || [];
        if (items.length) {
          return items.map((row) => ({
            appId: row.appid,
            priority: row.priority ?? 0,
            dateAdded: row.date_added
              ? new Date(row.date_added * 1000)
              : null,
          }));
        }
      } catch (err) {
        this.logger.warn(
          `IWishlistService failed for ${steamId}, trying store fallback: ${err}`,
        );
      }
    }

    try {
      const data = await this.fetchJson<
        Record<string, { priority?: number; added?: number }>
      >(
        `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=0`,
        `steam:wishlist:store:${steamId}`,
        300,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "QuestoryLabs/1.0",
          },
        },
      );
      return Object.entries(data || {})
        .filter(([appId]) => /^\d+$/.test(appId))
        .map(([appId, row]) => ({
          appId: Number(appId),
          priority: row.priority ?? 0,
          dateAdded: row.added ? new Date(row.added * 1000) : null,
        }));
    } catch (err) {
      this.logger.warn(`Wishlist unavailable for ${steamId}: ${err}`);
      return [];
    }
  }

  async getAppDetails(
    appId: number,
    countryCode?: string | null,
  ): Promise<StoreAppDetails | null> {
    try {
      const cc = countryCode?.trim().toUpperCase() || "";
      const ccQuery = cc ? `&cc=${encodeURIComponent(cc)}` : "";
      const data = await this.fetchJson<
        Record<string, { success: boolean; data?: StoreAppDetails }>
      >(
        `https://store.steampowered.com/api/appdetails?appids=${appId}${ccQuery}`,
        `steam:app:${appId}:${cc || "auto"}`,
        86400,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "QuestoryLabs/1.0",
          },
        },
      );
      const entry = data[String(appId)];
      if (!entry?.success || !entry.data) return null;
      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Official Steam Deck compatibility from the store report endpoint.
   * resolved_category: 1 unsupported, 2 playable, 3 verified.
   */
  async getDeckCompatibility(
    appId: number,
  ): Promise<"verified" | "playable" | "unsupported" | null> {
    try {
      const data = await this.fetchJson<{
        success?: number;
        results?: { resolved_category?: number | null };
      }>(
        `https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${appId}`,
        `steam:deck:${appId}`,
        86400,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "QuestoryLabs/1.0",
          },
        },
      );
      if (data.success !== 1) return null;
      const category = data.results?.resolved_category;
      if (category === 3) return "verified";
      if (category === 2) return "playable";
      if (category === 1) return "unsupported";
      return null;
    } catch (err) {
      this.logger.warn(`Deck compatibility for ${appId} failed: ${err}`);
      return null;
    }
  }

  headerImageFromAppId(appId: number, hash?: string) {
    if (hash) {
      return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`;
    }
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  }

  /** Full Steam store tag id → name map (cached). */
  async getTagList(): Promise<Map<number, string>> {
    const cacheKey = "steam:taglist:en";
    const cached = await this.cache.getJson<[number, string][]>(cacheKey);
    if (cached?.length) return new Map(cached);

    let tags: { tagid: number; name: string }[] = [];
    try {
      if (this.apiKey) {
        const data = await this.fetchJson<{
          response?: { tags?: { tagid: number; name: string }[] };
        }>(
          `${this.base}/IStoreService/GetTagList/v1/?key=${this.apiKey}&language=english`,
          undefined,
          0,
        );
        tags = data.response?.tags || [];
      }
    } catch (err) {
      this.logger.warn(`GetTagList failed: ${err}`);
    }

    if (!tags.length) {
      try {
        tags = await this.fetchJson<{ tagid: number; name: string }[]>(
          "https://store.steampowered.com/tagdata/populartags/english",
          undefined,
          0,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "QuestoryLabs/1.0",
            },
          },
        );
      } catch (err) {
        this.logger.warn(`Popular tags fallback failed: ${err}`);
      }
    }

    const map = new Map(tags.map((t) => [t.tagid, t.name]));
    if (map.size) {
      await this.cache.setJson(cacheKey, [...map.entries()], 86400 * 7);
    }
    return map;
  }

  async getAppTagNames(appId: number): Promise<string[]> {
    try {
      const items = await this.getStoreItems([appId]);
      const fromBrowse = items.get(appId)?.tagNames;
      if (fromBrowse?.length) return fromBrowse;
    } catch {
      /* fall through */
    }
    const [ids, tagList] = await Promise.all([
      this.getAppStoreTagIds(appId),
      this.getTagList(),
    ]);
    const names: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      const name = tagList.get(id);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    return names;
  }

  /**
   * Trending / top-selling store games, optionally narrowed by Steam feature
   * category IDs (category2) and tag IDs.
   */
  async searchStoreGames(options: {
    category2?: number[];
    tags?: number[];
    filter?: "globaltopsellers" | "popularnew" | "topsellers";
    /** Steam search sort_by value, e.g. Reviews_DESC, Released_DESC */
    sortBy?: string;
    count?: number;
  }): Promise<{ appId: number; name: string; headerImage: string | null }[]> {
    const count = Math.min(50, Math.max(1, options.count || 24));
    const category2 = (options.category2 || []).join(",");
    const tags = (options.tags || []).join(",");
    const filter = options.filter || "globaltopsellers";
    const params = new URLSearchParams({
      start: "0",
      count: String(count),
      json: "1",
      category1: "998",
    });
    if (options.sortBy) {
      params.set("sort_by", options.sortBy);
    } else {
      params.set("filter", filter);
    }
    if (category2) params.set("category2", category2);
    if (tags) params.set("tags", tags);

    const cacheKey = `steam:storesearch:${params.toString()}`;
    try {
      const data = await this.fetchJson<{
        items?: { name: string; logo?: string }[];
      }>(
        `https://store.steampowered.com/search/results/?${params.toString()}`,
        cacheKey,
        1800,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "QuestoryLabs/1.0",
          },
        },
      );

      const seen = new Set<number>();
      const results: { appId: number; name: string; headerImage: string | null }[] =
        [];
      for (const item of data.items || []) {
        const match = item.logo?.match(/\/apps\/(\d+)\//);
        if (!match) continue;
        const appId = Number(match[1]);
        if (!appId || seen.has(appId)) continue;
        seen.add(appId);
        results.push({
          appId,
          name: item.name,
          headerImage: this.headerImageFromAppId(appId),
        });
      }
      return results;
    } catch (err) {
      this.logger.warn(`Store search failed: ${err}`);
      return [];
    }
  }

  async getAppReviews(appId: number): Promise<{
    score: number | null;
    description: string | null;
    totalPositive: number;
    totalNegative: number;
    totalReviews: number;
  } | null> {
    try {
      const data = await this.fetchJson<{
        success?: number;
        query_summary?: {
          review_score?: number;
          review_score_desc?: string;
          total_positive?: number;
          total_negative?: number;
          total_reviews?: number;
        };
      }>(
        `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
        `steam:reviews:${appId}`,
        21600,
        { headers: this.storeHeaders() },
      );
      const summary = data.query_summary;
      if (!summary) return null;
      return {
        score: summary.review_score ?? null,
        description: summary.review_score_desc || null,
        totalPositive: summary.total_positive || 0,
        totalNegative: summary.total_negative || 0,
        totalReviews: summary.total_reviews || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Modern batch store metadata (tags, assets, reviews). Prefers this over
   * SteamCMD for tag IDs when available.
   */
  async getStoreItems(
    appIds: number[],
    countryCode = "US",
  ): Promise<Map<number, StoreBrowseItem>> {
    const unique = [...new Set(appIds.filter((id) => id > 0))];
    const out = new Map<number, StoreBrowseItem>();
    if (!unique.length) return out;

    const tagList = await this.getTagList();
    for (let i = 0; i < unique.length; i += 50) {
      const chunk = unique.slice(i, i + 50);
      const cacheKey = `steam:storeitems:${countryCode}:${chunk.join(",")}`;
      try {
        const data = await this.fetchJson<{
          response?: {
            store_items?: {
              success?: number;
              appid?: number;
              id?: number;
              name?: string;
              is_free?: boolean;
              tagids?: number[];
              tags?: { tagid: number }[];
              basic_info?: {
                short_description?: string;
                developers?: { name?: string }[];
                publishers?: { name?: string }[];
              };
              reviews?: {
                summary_filtered?: {
                  review_count?: number;
                  percent_positive?: number;
                  review_score?: number;
                  review_score_label?: string;
                };
              };
              assets?: {
                asset_url_format?: string;
                header?: string;
                header_2x?: string;
                library_capsule?: string;
                library_capsule_2x?: string;
              };
            }[];
          };
        }>(
          this.serviceUrl("IStoreBrowseService", "GetItems", {
            ids: chunk.map((appid) => ({ appid })),
            context: {
              country_code: countryCode,
              language: "english",
            },
            data_request: {
              include_assets: true,
              include_release: true,
              include_platforms: true,
              include_tag_count: 20,
              include_reviews: true,
              include_basic_info: true,
            },
          }),
          cacheKey,
          21600,
        );

        for (const item of data.response?.store_items || []) {
          if (item.success !== 1) continue;
          const appId = item.appid || item.id;
          if (!appId) continue;
          const tagIds =
            item.tagids?.length
              ? item.tagids
              : (item.tags || []).map((t) => t.tagid);
          const tagNames = tagIds
            .map((id) => tagList.get(id))
            .filter((n): n is string => Boolean(n));
          const assets = item.assets;
          const review = item.reviews?.summary_filtered;
          out.set(appId, {
            appId,
            name: item.name || `App ${appId}`,
            isFree: Boolean(item.is_free),
            shortDescription: item.basic_info?.short_description || null,
            developers: (item.basic_info?.developers || [])
              .map((d) => d.name)
              .filter((n): n is string => Boolean(n)),
            publishers: (item.basic_info?.publishers || [])
              .map((p) => p.name)
              .filter((n): n is string => Boolean(n)),
            tagIds,
            tagNames,
            headerImage: this.assetUrl(
              assets?.asset_url_format,
              assets?.header_2x || assets?.header,
            ),
            libraryCapsule: this.assetUrl(
              assets?.asset_url_format,
              assets?.library_capsule_2x || assets?.library_capsule,
            ),
            reviewScore: review?.review_score ?? null,
            reviewDescription: review?.review_score_label || null,
            percentPositive: review?.percent_positive ?? null,
            totalReviews: review?.review_count || 0,
          });
        }
      } catch (err) {
        this.logger.warn(`GetItems batch failed: ${err}`);
      }
    }
    return out;
  }

  async getAppStoreTagIds(appId: number): Promise<number[]> {
    try {
      const items = await this.getStoreItems([appId]);
      const fromBrowse = items.get(appId)?.tagIds;
      if (fromBrowse?.length) return fromBrowse;
    } catch {
      /* fall through to SteamCMD */
    }
    return this.getAppStoreTagIdsFromSteamCmd(appId);
  }

  /** SteamCMD fallback when GetItems has no tags. */
  private async getAppStoreTagIdsFromSteamCmd(appId: number): Promise<number[]> {
    try {
      const data = await this.fetchJson<{
        data?: Record<
          string,
          { common?: { store_tags?: Record<string, string> } }
        >;
      }>(
        `https://api.steamcmd.net/v1/info/${appId}`,
        `steam:steamcmd:${appId}`,
        86400,
        { headers: this.storeHeaders() },
      );
      const storeTags = data.data?.[String(appId)]?.common?.store_tags || {};
      return Object.values(storeTags)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);
    } catch (err) {
      this.logger.warn(`SteamCMD tags for ${appId} failed: ${err}`);
      return [];
    }
  }

  async getNewsForApp(
    appId: number,
    count = 8,
    maxlength = 300,
  ): Promise<SteamNewsItem[]> {
    try {
      const data = await this.fetchJson<{
        appnews?: {
          newsitems?: {
            gid?: string;
            title?: string;
            url?: string;
            contents?: string;
            date?: number;
            feedlabel?: string;
            author?: string;
            tags?: string[];
          }[];
        };
      }>(
        `${this.base}/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=${maxlength}`,
        `steam:news:${appId}:${count}`,
        1800,
      );
      return (data.appnews?.newsitems || []).map((n) => ({
        gid: n.gid || "",
        title: n.title || "Untitled",
        url: n.url || `https://store.steampowered.com/news/app/${appId}`,
        contents: n.contents || "",
        date: n.date || 0,
        feedLabel: n.feedlabel || "",
        author: n.author || "",
        tags: n.tags || [],
      }));
    } catch (err) {
      this.logger.warn(`News for ${appId} failed: ${err}`);
      return [];
    }
  }

  async getGlobalAchievementPercentages(
    appId: number,
  ): Promise<{ name: string; percent: number }[]> {
    try {
      const data = await this.fetchJson<{
        achievementpercentages?: {
          achievements?: { name?: string; percent?: string | number }[];
        };
      }>(
        `${this.base}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`,
        `steam:globalach:${appId}`,
        86400,
      );
      return (data.achievementpercentages?.achievements || [])
        .map((a) => ({
          name: a.name || "",
          percent: Number(a.percent) || 0,
        }))
        .filter((a) => a.name);
    } catch (err) {
      this.logger.warn(`Global achievements for ${appId} failed: ${err}`);
      return [];
    }
  }

  async getSchemaForGame(appId: number): Promise<{
    gameName: string | null;
    achievements: SteamAchievementSchema[];
  } | null> {
    if (!this.apiKey) return null;
    try {
      const data = await this.fetchJson<{
        game?: {
          gameName?: string;
          availableGameStats?: {
            achievements?: {
              name?: string;
              displayName?: string;
              description?: string;
              icon?: string;
              icongray?: string;
              hidden?: number;
            }[];
          };
        };
      }>(
        `${this.base}/ISteamUserStats/GetSchemaForGame/v2/?key=${this.apiKey}&appid=${appId}&l=english`,
        `steam:schema:${appId}`,
        86400 * 7,
      );
      const achievements = (
        data.game?.availableGameStats?.achievements || []
      ).map((a) => ({
        name: a.name || "",
        displayName: a.displayName || a.name || "",
        description: a.description || "",
        icon: a.icon || "",
        iconGray: a.icongray || "",
        hidden: a.hidden === 1,
      }));
      return {
        gameName: data.game?.gameName || null,
        achievements: achievements.filter((a) => a.name),
      };
    } catch (err) {
      this.logger.warn(`Schema for ${appId} failed: ${err}`);
      return null;
    }
  }

  async getDlcForApp(appId: number): Promise<SteamDlcItem[]> {
    try {
      const data = await this.fetchJson<{
        status?: number;
        dlc?: {
          id?: number;
          name?: string;
          header_image?: string;
          price_overview?: {
            currency?: string;
            final?: number;
            discount_percent?: number;
          };
        }[];
      }>(
        `https://store.steampowered.com/api/dlcforapp?appid=${appId}`,
        `steam:dlc:${appId}`,
        86400,
        { headers: this.storeHeaders() },
      );
      if (data.status !== 1) return [];
      return (data.dlc || [])
        .map((d) => ({
          appId: d.id || 0,
          name: d.name || `DLC ${d.id}`,
          headerImage: d.header_image || null,
          finalPrice:
            d.price_overview?.final != null
              ? d.price_overview.final / 100
              : null,
          currency: d.price_overview?.currency || null,
          discountPercent: d.price_overview?.discount_percent || 0,
        }))
        .filter((d) => d.appId > 0);
    } catch (err) {
      this.logger.warn(`DLC for ${appId} failed: ${err}`);
      return [];
    }
  }

  async getPackageDetails(
    packageIds: number[],
    countryCode = "US",
  ): Promise<Map<number, SteamPackageDetails>> {
    const out = new Map<number, SteamPackageDetails>();
    const unique = [...new Set(packageIds.filter((id) => id > 0))];
    if (!unique.length) return out;

    for (let i = 0; i < unique.length; i += 10) {
      const chunk = unique.slice(i, i + 10);
      try {
        const data = await this.fetchJson<
          Record<
            string,
            {
              success?: boolean;
              data?: {
                name?: string;
                header_image?: string;
                page_image?: string;
                apps?: { id: number; name: string }[];
                price?: {
                  currency?: string;
                  initial?: number;
                  final?: number;
                  discount_percent?: number;
                };
              };
            }
          >
        >(
          `https://store.steampowered.com/api/packagedetails?packageids=${chunk.join(",")}&cc=${encodeURIComponent(countryCode)}`,
          `steam:packages:${countryCode}:${chunk.join(",")}`,
          21600,
          { headers: this.storeHeaders() },
        );
        for (const id of chunk) {
          const entry = data[String(id)];
          if (!entry?.success || !entry.data) continue;
          const price = entry.data.price;
          out.set(id, {
            packageId: id,
            name: entry.data.name || `Package ${id}`,
            headerImage:
              entry.data.header_image || entry.data.page_image || null,
            apps: entry.data.apps || [],
            price: price
              ? {
                  currency: price.currency || "USD",
                  initial: (price.initial || 0) / 100,
                  final: (price.final || 0) / 100,
                  discountPercent: price.discount_percent || 0,
                }
              : null,
          });
        }
      } catch (err) {
        this.logger.warn(`Package details failed: ${err}`);
      }
    }
    return out;
  }

  async getReviewHistogram(appId: number): Promise<
    {
      date: number;
      recommendationsUp: number;
      recommendationsDown: number;
    }[]
  > {
    try {
      const data = await this.fetchJson<{
        success?: number;
        results?: {
          rollups?: {
            date?: number;
            recommendations_up?: number;
            recommendations_down?: number;
          }[];
        };
      }>(
        `https://store.steampowered.com/appreviewhistogram/${appId}?l=english&json=1`,
        `steam:reviewhist:${appId}`,
        21600,
        { headers: this.storeHeaders() },
      );
      if (data.success !== 1) return [];
      return (data.results?.rollups || []).map((r) => ({
        date: r.date || 0,
        recommendationsUp: r.recommendations_up || 0,
        recommendationsDown: r.recommendations_down || 0,
      }));
    } catch (err) {
      this.logger.warn(`Review histogram for ${appId} failed: ${err}`);
      return [];
    }
  }

  /**
   * Incremental Steam store catalog page via IStoreService/GetAppList.
   * Requires API key. max_results capped at 50k by Valve.
   */
  async getAppListPage(options?: {
    lastAppId?: number;
    ifModifiedSince?: number;
    maxResults?: number;
    includeDlc?: boolean;
  }): Promise<{
    apps: SteamCatalogApp[];
    haveMore: boolean;
    lastAppId: number;
  }> {
    if (!this.apiKey) {
      this.logger.warn("STEAM_API_KEY missing — skipping GetAppList");
      return { apps: [], haveMore: false, lastAppId: options?.lastAppId || 0 };
    }
    const maxResults = Math.min(50000, Math.max(1, options?.maxResults || 10000));
    const input: Record<string, unknown> = {
      max_results: maxResults,
      include_games: true,
      include_dlc: Boolean(options?.includeDlc),
      include_software: false,
      include_videos: false,
      include_hardware: false,
    };
    if (options?.lastAppId) input.last_appid = options.lastAppId;
    if (options?.ifModifiedSince) {
      input.if_modified_since = options.ifModifiedSince;
    }

    try {
      const data = await this.fetchJson<{
        response?: {
          apps?: {
            appid: number;
            name?: string;
            last_modified?: number;
            price_change_number?: number;
          }[];
          have_more_results?: boolean;
          last_appid?: number;
        };
      }>(
        this.serviceUrl("IStoreService", "GetAppList", input),
        undefined,
        0,
      );
      const apps = (data.response?.apps || []).map((a) => ({
        appId: a.appid,
        name: a.name || `App ${a.appid}`,
        lastModified: a.last_modified ?? null,
        priceChangeNumber: a.price_change_number ?? null,
      }));
      return {
        apps,
        haveMore: Boolean(data.response?.have_more_results),
        lastAppId:
          data.response?.last_appid ||
          apps[apps.length - 1]?.appId ||
          options?.lastAppId ||
          0,
      };
    } catch (err) {
      this.logger.warn(`GetAppList failed: ${err}`);
      return {
        apps: [],
        haveMore: false,
        lastAppId: options?.lastAppId || 0,
      };
    }
  }
}
