import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from "@nestjs/common";
import { Queue, Worker, Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { SteamApiService } from "../steam/steam-api.service";
import { CatalogService } from "../steam/catalog.service";
import { ItadService } from "../steam/itad.service";
import { PlayerCountService } from "../steam/player-count.service";
import { CollectionsService } from "../collections/collections.service";
import { GameMergeService } from "../stores/game-merge.service";
import { StoresService } from "../stores/stores.service";
import { AccountsService } from "../accounts/accounts.service";
import {
  parseStringArray,
  stringifyStringArray,
} from "../lib/json-arrays";
import { currencyFromCountry, normalizePriceCountry } from "../lib/currency";
import { resolveSyncMode } from "../lib/runtime-config";
import { parseSteamReleaseDate } from "../lib/steam-dates";
import { truncateToUtcHour } from "./play-activity";

type SyncJobType =
  | "library-sync"
  | "wishlist-sync"
  | "friends-sync"
  | "metadata-refresh";

type SyncJobData = {
  userId: string;
  steamId: string;
  type: SyncJobType;
  syncJobId: string;
  force?: boolean;
};

type SyncEnqueueOpts = {
  force?: boolean;
};

type EnqueueResult = {
  job: { id: string; type: string; status: string };
  coalesced: boolean;
};

/** Shared game metadata: skip Steam enrich when fresher than this. */
const METADATA_FRESH_MS = 24 * 60 * 60 * 1000;
const ENRICH_LOCK_TTL_SECONDS = 120;

function isMetadataFresh(syncedAt: Date | null | undefined): boolean {
  if (!syncedAt) return false;
  return Date.now() - syncedAt.getTime() < METADATA_FRESH_MS;
}

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private queue!: Queue<SyncJobData>;
  private worker!: Worker<SyncJobData>;
  private inlineMode = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly steam: SteamApiService,
    private readonly catalog: CatalogService,
    private readonly itad: ItadService,
    private readonly playerCounts: PlayerCountService,
    private readonly accounts: AccountsService,
    @Inject(forwardRef(() => CollectionsService))
    private readonly collections: CollectionsService,
    @Inject(forwardRef(() => GameMergeService))
    private readonly merge: GameMergeService,
    @Inject(forwardRef(() => StoresService))
    private readonly stores: StoresService,
  ) {}

  async onModuleInit() {
    const mode = resolveSyncMode();
    if (mode === "inline") {
      this.inlineMode = true;
      this.logger.log(
        "Using inline sync (REDIS_URL unset or USE_INLINE_SYNC=true)",
      );
      return;
    }

    const redisUrl = process.env.REDIS_URL!.trim();
    try {
      const connection = { url: redisUrl };
      this.queue = new Queue<SyncJobData>("steam-sync", { connection });
      this.worker = new Worker<SyncJobData>(
        "steam-sync",
        async (job) => this.process(job),
        { connection, concurrency: 2 },
      );
      this.worker.on("failed", (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });
      await this.queue.waitUntilReady();
      this.logger.log("Using BullMQ sync via Redis");
    } catch (err) {
      this.logger.warn(`BullMQ unavailable, using inline sync: ${err}`);
      this.inlineMode = true;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueAll(
    userId: string,
    steamId: string,
    opts?: SyncEnqueueOpts,
  ): Promise<{ ok: true; coalesced: boolean }> {
    const results = await Promise.all([
      this.enqueue(userId, steamId, "library-sync", opts),
      this.enqueue(userId, steamId, "wishlist-sync", opts),
      this.enqueue(userId, steamId, "friends-sync", opts),
      this.enqueue(userId, steamId, "metadata-refresh", opts),
    ]);
    return {
      ok: true,
      coalesced: results.every((r) => r.coalesced),
    };
  }

  /** Daily cron: prices + library stats / metadata (not friends/wishlist). */
  async enqueueDailyPriceStats(userId: string, steamId: string) {
    await Promise.all([
      this.enqueue(userId, steamId, "library-sync"),
      this.enqueue(userId, steamId, "metadata-refresh"),
    ]);
  }

  async enqueue(
    userId: string,
    steamId: string,
    type: SyncJobData["type"],
    opts?: SyncEnqueueOpts,
  ): Promise<EnqueueResult> {
    if (!opts?.force) {
      const existing = await this.prisma.syncJob.findFirst({
        where: {
          userId,
          type,
          status: { in: ["pending", "running"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return { job: existing, coalesced: true };
      }
    }

    const syncJob = await this.prisma.syncJob.create({
      data: { userId, type, status: "pending" },
    });
    const payload: SyncJobData = {
      userId,
      steamId,
      type,
      syncJobId: syncJob.id,
      force: opts?.force || undefined,
    };
    if (this.inlineMode || !this.queue) {
      void this.runInline(payload);
      return { job: syncJob, coalesced: false };
    }
    await this.queue.add(type, payload, {
      removeOnComplete: 50,
      removeOnFail: 50,
    });
    return { job: syncJob, coalesced: false };
  }

  private async runInline(data: SyncJobData) {
    try {
      await this.process({ data } as Job<SyncJobData>);
    } catch (err) {
      this.logger.error(`Inline sync failed: ${err}`);
    }
  }

  private async process(job: Job<SyncJobData>) {
    const { userId, steamId, type, syncJobId, force } = job.data;
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: { status: "running", startedAt: new Date() },
    });
    try {
      if (type === "library-sync") {
        await this.syncLibrary(userId, steamId, { force });
      }
      if (type === "wishlist-sync") await this.syncWishlist(userId, steamId);
      if (type === "friends-sync") await this.syncFriends(userId, steamId);
      if (type === "metadata-refresh") {
        await this.refreshMetadata(userId, { force });
      }
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: { status: "completed", finishedAt: new Date(), error: null },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: { status: "failed", finishedAt: new Date(), error: message },
      });
      throw err;
    }
  }

  private async syncLibrary(
    userId: string,
    steamId: string,
    opts?: SyncEnqueueOpts,
  ) {
    const [games, recentlyPlayed] = await Promise.all([
      this.steam.getOwnedGames(steamId),
      this.steam.getRecentlyPlayedGames(steamId, 12),
    ]);

    /** Prefer fresher 2-week / last-played from GetRecentlyPlayedGames. */
    const recentByApp = new Map(recentlyPlayed.map((g) => [g.appid, g]));

    for (const g of games) {
      const recent = recentByApp.get(g.appid);
      const playtime2Weeks =
        recent?.playtime_2weeks ?? g.playtime_2weeks ?? null;
      const lastPlayedUnix =
        recent?.rtime_last_played ?? g.rtime_last_played;
      const headerImage = this.steam.headerImageFromAppId(g.appid);
      const { game, listing } = await this.merge.upsertListing({
        store: "steam",
        externalId: String(g.appid),
        steamAppId: g.appid,
        name: g.name || `App ${g.appid}`,
        headerImage,
        userId,
      });
      await this.merge.upsertOwnership({
        userId,
        gameId: game.id,
        listingId: listing.id,
        store: "steam",
        playtimeForever: g.playtime_forever || 0,
        lastPlayedAt: lastPlayedUnix
          ? new Date(lastPlayedUnix * 1000)
          : null,
      });
      await this.prisma.libraryEntry.updateMany({
        where: { userId, gameId: game.id },
        data: {
          playtime2Weeks,
        },
      });

      const hasRecentSignal =
        (playtime2Weeks != null && playtime2Weeks > 0) ||
        recentByApp.has(g.appid);
      if (hasRecentSignal) {
        await this.upsertPlayActivitySnapshot({
          userId,
          gameId: game.id,
          appId: g.appid,
          playtimeForever: g.playtime_forever || 0,
          playtime2Weeks,
          lastPlayedAt: lastPlayedUnix
            ? new Date(lastPlayedUnix * 1000)
            : null,
          source: recentByApp.has(g.appid) ? "recent_sync" : "owned_sync",
        });
      }
    }

    // Recently played free/unowned edge cases: ensure listing + snapshot even
    // if missing from the owned list response.
    for (const g of recentlyPlayed) {
      if (games.some((o) => o.appid === g.appid)) continue;
      const headerImage = this.steam.headerImageFromAppId(g.appid);
      const { game, listing } = await this.merge.upsertListing({
        store: "steam",
        externalId: String(g.appid),
        steamAppId: g.appid,
        name: g.name || `App ${g.appid}`,
        headerImage,
        userId,
      });
      await this.merge.upsertOwnership({
        userId,
        gameId: game.id,
        listingId: listing.id,
        store: "steam",
        playtimeForever: g.playtime_forever || 0,
        lastPlayedAt: g.rtime_last_played
          ? new Date(g.rtime_last_played * 1000)
          : null,
      });
      await this.prisma.libraryEntry.updateMany({
        where: { userId, gameId: game.id },
        data: { playtime2Weeks: g.playtime_2weeks ?? null },
      });
      await this.upsertPlayActivitySnapshot({
        userId,
        gameId: game.id,
        appId: g.appid,
        playtimeForever: g.playtime_forever || 0,
        playtime2Weeks: g.playtime_2weeks ?? null,
        lastPlayedAt: g.rtime_last_played
          ? new Date(g.rtime_last_played * 1000)
          : null,
        source: "recent_sync",
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const countryCode = normalizePriceCountry(user?.countryCode);

    // Prefer games needing metadata; skip Steam enrich when already fresh.
    const sample = await this.pickEnrichSample(games, 40, opts?.force);
    const sampleIds = sample.map((g) => g.appid);
    const storeItems =
      sampleIds.length > 0
        ? await this.steam.getStoreItems(sampleIds, countryCode || "US")
        : new Map();
    for (const g of sample) {
      await this.enrichGame(g.appid, countryCode, storeItems.get(g.appid), {
        force: opts?.force,
      });
      await new Promise((r) => setTimeout(r, 180));
    }

    await this.syncAchievements(userId, steamId, games);
    await this.syncLibraryPrices(userId);
    await this.collections.rebuildAutoCollections(userId);
  }

  /** Pick up to `limit` apps, preferring stale/missing metadata (unless force). */
  private async pickEnrichSample(
    games: { appid: number; playtime_forever: number }[],
    limit: number,
    force?: boolean,
  ) {
    const appIds = games.map((g) => g.appid);
    const existing =
      appIds.length > 0
        ? await this.prisma.game.findMany({
            where: { appId: { in: appIds } },
            select: { appId: true, metadataSyncedAt: true },
          })
        : [];
    const metaByApp = new Map(
      existing.map((g) => [g.appId as number, g.metadataSyncedAt]),
    );

    const candidates = force
      ? [...games]
      : games.filter((g) => !isMetadataFresh(metaByApp.get(g.appid) ?? null));

    return candidates
      .sort(
        (a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0),
      )
      .slice(0, limit);
  }

  /** Sample achievements for top / recently active games (rate-limit friendly). */
  private async syncAchievements(
    userId: string,
    steamId: string,
    games: {
      appid: number;
      playtime_forever: number;
      playtime_2weeks?: number;
    }[],
  ) {
    const ranked = [...games]
      .filter((g) => (g.playtime_forever || 0) > 0)
      .sort((a, b) => {
        const aRecent = a.playtime_2weeks || 0;
        const bRecent = b.playtime_2weeks || 0;
        if (bRecent !== aRecent) return bRecent - aRecent;
        return (b.playtime_forever || 0) - (a.playtime_forever || 0);
      })
      .slice(0, 20);

    for (const g of ranked) {
      const stats = await this.steam.getPlayerAchievements(steamId, g.appid);
      if (!stats) {
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }
      const entry = await this.prisma.libraryEntry.findFirst({
        where: { userId, game: { appId: g.appid } },
      });
      if (entry) {
        await this.prisma.libraryEntry.update({
          where: { id: entry.id },
          data: {
            achievementUnlocked: stats.unlocked,
            achievementTotal: stats.total,
            achievementPct: stats.pct,
            achievementSyncedAt: new Date(),
          },
        });
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  /** Fill current/lowest store prices for owned games (ITAD + Steam fallback). */
  async syncLibraryPrices(userId: string, steamLimit = 80) {
    const [user, entries] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.libraryEntry.findMany({
        where: { userId, hidden: false },
        include: { game: true },
        orderBy: { playtimeForever: "desc" },
      }),
    ]);
    if (!entries.length) return { priced: 0 };

    const countryCode = normalizePriceCountry(user?.countryCode);
    const currency = currencyFromCountry(countryCode);
    const steamAppIds = entries
      .map((e) => e.game.appId)
      .filter((id): id is number => id != null);
    const itadPrices = await this.itad.getSteamPrices(
      steamAppIds,
      countryCode || "US",
    );
    let priced = 0;
    const pricedByItad = new Set<number>();

    for (const entry of entries) {
      const appId = entry.game.appId;
      if (appId == null) continue;
      const itad = itadPrices[appId];
      if (itad?.current == null && itad?.lowest == null) continue;
      const current = itad.current;
      const lowest =
        itad.lowest != null && current != null
          ? Math.min(itad.lowest, current)
          : (itad.lowest ?? current);
      await this.applyGamePrices(appId, {
        current,
        lowest,
        currency,
        isFree: entry.game.isFree || current === 0,
      });
      pricedByItad.add(appId);
      priced += 1;
    }

    // Also refresh Epic/GOG listing prices for linked ownerships
    await this.stores.applyListingPrices(userId, "epic", countryCode || "US");
    await this.stores.applyListingPrices(userId, "gog", countryCode || "US");

    const needsSteam = entries
      .filter((e) => {
        if (e.game.appId == null || pricedByItad.has(e.game.appId)) return false;
        const g = e.game;
        if (g.isFree) return g.currentPrice == null;
        const stale =
          !g.priceSyncedAt ||
          Date.now() - g.priceSyncedAt.getTime() > 1000 * 60 * 60 * 24 * 7;
        return g.currentPrice == null || stale;
      })
      .slice(0, steamLimit);

    for (const entry of needsSteam) {
      if (entry.game.appId == null) continue;
      // Price path already filtered to stale/missing prices — bypass metadata TTL.
      await this.enrichGame(entry.game.appId, countryCode, undefined, {
        force: true,
      });
      priced += 1;
      await new Promise((r) => setTimeout(r, 220));
    }

    // Ensure free games count as $0
    await this.prisma.game.updateMany({
      where: {
        isFree: true,
        libraryEntries: { some: { userId } },
        currentPrice: null,
      },
      data: {
        currentPrice: 0,
        lowestPrice: 0,
        priceSyncedAt: new Date(),
      },
    });

    return { priced };
  }

  private async applyGamePrices(
    appId: number,
    prices: {
      current: number | null;
      lowest: number | null;
      currency?: string | null;
      isFree?: boolean;
    },
  ) {
    const existing = await this.prisma.game.findFirst({ where: { appId } });
    if (!existing) return;

    let current = prices.current;
    let lowest = prices.lowest;

    if (prices.isFree || existing.isFree) {
      current = 0;
      lowest = 0;
    }

    if (current != null) {
      const prevLowest = existing.lowestPrice;
      const candidates = [lowest, prevLowest, current].filter(
        (n): n is number => n != null,
      );
      lowest = candidates.length ? Math.min(...candidates) : current;
    } else if (lowest != null && existing.lowestPrice != null) {
      lowest = Math.min(lowest, existing.lowestPrice);
    }

    const currency = prices.currency?.trim().toUpperCase() || null;

    await this.prisma.game.update({
      where: { id: existing.id },
      data: {
        ...(current != null ? { currentPrice: current } : {}),
        ...(lowest != null ? { lowestPrice: lowest } : {}),
        ...(currency ? { priceCurrency: currency } : {}),
        priceSyncedAt: new Date(),
        ...(prices.isFree ? { isFree: true } : {}),
      },
    });

    await this.prisma.gameStoreListing.updateMany({
      where: { store: "steam", externalId: String(appId) },
      data: {
        ...(current != null ? { currentPrice: current } : {}),
        ...(lowest != null ? { lowestPrice: lowest } : {}),
        ...(currency ? { priceCurrency: currency } : {}),
        priceSyncedAt: new Date(),
        ...(prices.isFree ? { isFree: true } : {}),
      },
    });
  }

  private async enrichGame(
    appId: number,
    countryCode?: string | null,
    storeItem?: {
      name: string;
      isFree: boolean;
      developers: string[];
      publishers: string[];
      tagNames: string[];
      headerImage: string | null;
      reviewScore: number | null;
    } | null,
    opts?: SyncEnqueueOpts,
  ) {
    const existing = await this.prisma.game.findFirst({ where: { appId } });
    if (!existing) return;

    if (!opts?.force && isMetadataFresh(existing.metadataSyncedAt)) {
      return;
    }

    const lockKey = `sync:enrich:${appId}`;
    const acquired = await this.cache.acquireLock(
      lockKey,
      ENRICH_LOCK_TTL_SECONDS,
    );
    if (!acquired) {
      return;
    }

    try {
      if (!opts?.force) {
        const again = await this.prisma.game.findFirst({
          where: { appId },
          select: { metadataSyncedAt: true },
        });
        if (isMetadataFresh(again?.metadataSyncedAt ?? null)) {
          return;
        }
      }

      const [details, deckStatus, browseItem] = await Promise.all([
        this.steam.getAppDetails(appId, countryCode),
        this.steam.getDeckCompatibility(appId),
        storeItem
          ? Promise.resolve(storeItem)
          : this.steam
              .getStoreItems([appId], countryCode || "US")
              .then((m) => m.get(appId) || null),
      ]);
      if (!details && !browseItem) return;

      const categories = (details?.categories || []).map((c) => c.description);
      const genres = (details?.genres || []).map((g) => g.description);
      const multiplayerCaps = categories.filter((c) =>
        /multi|co-op|pvp|shared|cross/i.test(c),
      );
      const controllers = categories.filter((c) =>
        /controller|steam input/i.test(c),
      );

      const releaseDate = parseSteamReleaseDate(details?.release_date?.date);
      const tagNames =
        browseItem?.tagNames?.length
          ? browseItem.tagNames
          : await this.steam.getAppTagNames(appId);

      const steamCurrent =
        details?.is_free || browseItem?.isFree
          ? 0
          : details?.price_overview != null
            ? details.price_overview.final / 100
            : null;
      const steamCurrency =
        details?.price_overview?.currency ||
        currencyFromCountry(countryCode);

      const game = await this.prisma.game.findFirst({ where: { appId } });
      if (!game) return;

      const name = details?.name || browseItem?.name || game.name;
      const headerImage =
        details?.header_image ||
        browseItem?.headerImage ||
        game.headerImage ||
        undefined;
      const developers =
        details?.developers?.length
          ? details.developers
          : browseItem?.developers || [];
      const publishers =
        details?.publishers?.length
          ? details.publishers
          : browseItem?.publishers || [];
      const isFree = Boolean(details?.is_free ?? browseItem?.isFree);

      await this.prisma.game.update({
        where: { id: game.id },
        data: {
          name,
          headerImage,
          ...(releaseDate ? { releaseDate } : {}),
          ...(genres.length ? { genres: stringifyStringArray(genres) } : {}),
          ...(categories.length
            ? { categories: stringifyStringArray(categories) }
            : {}),
          tags: stringifyStringArray(tagNames),
          developers: stringifyStringArray(developers),
          publishers: stringifyStringArray(publishers),
          isFree,
          controllers: stringifyStringArray(controllers),
          multiplayerCaps: stringifyStringArray(multiplayerCaps),
          ...(browseItem?.reviewScore != null
            ? { reviewScore: browseItem.reviewScore }
            : {}),
          // Only write when the deck report succeeds — don't wipe a known status.
          ...(deckStatus ? { deckStatus } : {}),
          metadataSyncedAt: new Date(),
        },
      });

      await this.prisma.gameStoreListing.updateMany({
        where: { store: "steam", externalId: String(appId) },
        data: {
          headerImage: headerImage || undefined,
          isFree,
        },
      });

      // IGDB → Steam numbered tags; respects playerCountSyncedAt freshness.
      await this.playerCounts.resolveForSteamApp(appId);

      if (steamCurrent != null) {
        await this.applyGamePrices(appId, {
          current: steamCurrent,
          lowest: steamCurrent,
          currency: steamCurrency,
          isFree,
        });
      }
    } finally {
      await this.cache.releaseLock(lockKey);
    }
  }

  private async syncWishlist(userId: string, steamId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const countryCode = normalizePriceCountry(user?.countryCode);
    const items = await this.steam.getWishlist(steamId);
    const prices = await this.itad.getSteamPrices(
      items.map((i) => i.appId),
      countryCode || "US",
    );
    const library = await this.prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: true },
    });
    const genreAffinity = new Map<string, number>();
    for (const entry of library) {
      for (const genre of parseStringArray(entry.game.genres)) {
        genreAffinity.set(genre, (genreAffinity.get(genre) || 0) + 1);
      }
    }

    for (const item of items) {
      const details = await this.steam.getAppDetails(item.appId, countryCode);
      const price = prices[item.appId] || { current: null, lowest: null };
      const steamPrice =
        details?.price_overview != null
          ? details.price_overview.final / 100
          : null;
      const currentPrice = price.current ?? steamPrice;
      const lowestPrice = price.lowest ?? steamPrice;
      const genres = (details?.genres || []).map((g) => g.description);
      const affinity = genres.reduce(
        (sum, g) => sum + (genreAffinity.get(g) || 0),
        0,
      );
      const discountDepth =
        lowestPrice && currentPrice && currentPrice > 0
          ? Math.max(0, (1 - lowestPrice / currentPrice) * 100)
          : details?.price_overview?.discount_percent || 0;
      const ageDays = item.dateAdded
        ? (Date.now() - item.dateAdded.getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const shouldBuyScore = Math.min(
        100,
        Math.round(discountDepth * 0.5 + Math.min(ageDays, 90) * 0.3 + affinity * 2),
      );

      const name = details?.name || `App ${item.appId}`;
      const headerImage =
        details?.header_image || this.steam.headerImageFromAppId(item.appId);

      const externalId = String(item.appId);
      const previous = await this.prisma.wishlistItem.findUnique({
        where: {
          userId_store_externalId: {
            userId,
            store: "steam",
            externalId,
          },
        },
      });

      const steamGame = await this.prisma.game.findFirst({
        where: { appId: item.appId },
      });

      await this.prisma.wishlistItem.upsert({
        where: {
          userId_store_externalId: {
            userId,
            store: "steam",
            externalId,
          },
        },
        create: {
          userId,
          store: "steam",
          externalId,
          appId: item.appId,
          gameId: steamGame?.id,
          name,
          headerImage,
          priority: item.priority,
          dateAdded: item.dateAdded,
          currentPrice,
          lowestPrice,
          shouldBuyScore,
          genres: stringifyStringArray(genres),
        },
        update: {
          appId: item.appId,
          gameId: steamGame?.id,
          name,
          headerImage,
          priority: item.priority,
          dateAdded: item.dateAdded,
          currentPrice,
          lowestPrice,
          shouldBuyScore,
          genres: stringifyStringArray(genres),
          syncedAt: new Date(),
        },
      });

      await this.maybeNotifyDeal(userId, {
        appId: item.appId,
        store: "steam",
        externalId,
        name,
        currentPrice,
        lowestPrice,
        targetPrice: previous?.targetPrice ?? null,
        shouldBuyScore,
      });

      await new Promise((r) => setTimeout(r, 200));
    }
  }

  private async maybeNotifyDeal(
    userId: string,
    item: {
      appId?: number | null;
      store?: string;
      externalId?: string;
      name: string;
      currentPrice: number | null;
      lowestPrice: number | null;
      targetPrice: number | null;
      shouldBuyScore: number | null;
    },
  ) {
    if (item.currentPrice == null) return;

    let reason: "target" | "historical_low" | "strong_score" | null = null;
    if (item.targetPrice != null && item.currentPrice <= item.targetPrice) {
      reason = "target";
    } else if (
      item.lowestPrice != null &&
      item.currentPrice <= item.lowestPrice * 1.05
    ) {
      reason = "historical_low";
    } else if ((item.shouldBuyScore || 0) >= 75) {
      reason = "strong_score";
    }
    if (!reason) return;

    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
    const dedupeKey =
      item.externalId != null
        ? `"externalId":"${item.externalId}"`
        : `"appId":${item.appId}`;
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId,
        type: "deal",
        createdAt: { gte: since },
        meta: { contains: dedupeKey },
      },
    });
    if (existing) return;

    const titles = {
      target: "Target price hit",
      historical_low: "Near historical low",
      strong_score: "Strong buy signal",
    } as const;

    await this.prisma.notification.create({
      data: {
        userId,
        type: "deal",
        title: titles[reason],
        body: `${item.name} looks like a good buy right now.`,
        href: "/wishlist",
        meta: JSON.stringify({
          appId: item.appId ?? null,
          store: item.store ?? "steam",
          externalId: item.externalId ?? null,
          reason,
          currentPrice: item.currentPrice,
        }),
      },
    });
  }

  private async syncFriends(userId: string, steamId: string) {
    const friends = await this.steam.getFriendList(steamId);
    const summaries = await this.steam.getPlayerSummaries(
      friends.map((f) => f.steamid),
    );
    const summaryMap = new Map(summaries.map((s) => [s.steamid, s]));

    for (const friend of friends) {
      const summary = summaryMap.get(friend.steamid);
      const existingUser = await this.accounts.findUserBySteamId(
        friend.steamid,
      );
      await this.prisma.friendship.upsert({
        where: {
          userId_friendSteamId: { userId, friendSteamId: friend.steamid },
        },
        create: {
          userId,
          friendSteamId: friend.steamid,
          friendUserId: existingUser?.id,
          personaName: summary?.personaname || friend.steamid,
          avatarUrl: summary?.avatarfull || null,
        },
        update: {
          friendUserId: existingUser?.id,
          personaName: summary?.personaname || friend.steamid,
          avatarUrl: summary?.avatarfull || null,
        },
      });
    }

    // Cache libraries + recent plays for a limited set of friends
    for (const friend of friends.slice(0, 15)) {
      try {
        const owned = await this.steam.getOwnedGames(friend.steamid);
        for (const g of owned.slice(0, 200)) {
          await this.prisma.friendLibraryCache.upsert({
            where: {
              ownerSteamId_gameAppId: {
                ownerSteamId: friend.steamid,
                gameAppId: g.appid,
              },
            },
            create: {
              ownerSteamId: friend.steamid,
              gameAppId: g.appid,
              gameName: g.name || `App ${g.appid}`,
              headerImage: this.steam.headerImageFromAppId(g.appid),
              playtimeForever: g.playtime_forever || 0,
            },
            update: {
              gameName: g.name || `App ${g.appid}`,
              playtimeForever: g.playtime_forever || 0,
              syncedAt: new Date(),
            },
          });
        }

        const recent = await this.steam.getRecentlyPlayedGames(
          friend.steamid,
          12,
        );
        for (const g of recent) {
          await this.prisma.friendRecentPlayCache.upsert({
            where: {
              ownerSteamId_gameAppId: {
                ownerSteamId: friend.steamid,
                gameAppId: g.appid,
              },
            },
            create: {
              ownerSteamId: friend.steamid,
              gameAppId: g.appid,
              gameName: g.name || `App ${g.appid}`,
              headerImage: this.steam.headerImageFromAppId(g.appid),
              playtime2Weeks: g.playtime_2weeks ?? 0,
              playtimeForever: g.playtime_forever || 0,
            },
            update: {
              gameName: g.name || `App ${g.appid}`,
              headerImage: this.steam.headerImageFromAppId(g.appid),
              playtime2Weeks: g.playtime_2weeks ?? 0,
              playtimeForever: g.playtime_forever || 0,
              syncedAt: new Date(),
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Friend library skip ${friend.steamid}: ${err}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  /**
   * Persist a hour-bucketed playtime observation. Skips when an identical
   * snapshot already exists for this hour (dedupe across frequent syncs).
   * Timeranges between sessions are inferred from ΔplaytimeForever later.
   */
  private async upsertPlayActivitySnapshot(opts: {
    userId: string;
    gameId: string;
    appId: number;
    playtimeForever: number;
    playtime2Weeks: number | null;
    lastPlayedAt: Date | null;
    source: "owned_sync" | "recent_sync";
  }) {
    const observedAt = truncateToUtcHour(new Date());
    const existing = await this.prisma.playActivitySnapshot.findUnique({
      where: {
        userId_gameId_observedAt: {
          userId: opts.userId,
          gameId: opts.gameId,
          observedAt,
        },
      },
    });
    if (
      existing &&
      existing.playtimeForever === opts.playtimeForever &&
      existing.playtime2Weeks === opts.playtime2Weeks
    ) {
      return;
    }
    await this.prisma.playActivitySnapshot.upsert({
      where: {
        userId_gameId_observedAt: {
          userId: opts.userId,
          gameId: opts.gameId,
          observedAt,
        },
      },
      create: {
        userId: opts.userId,
        gameId: opts.gameId,
        appId: opts.appId,
        observedAt,
        playtimeForever: opts.playtimeForever,
        playtime2Weeks: opts.playtime2Weeks,
        lastPlayedAt: opts.lastPlayedAt,
        source: opts.source,
      },
      update: {
        appId: opts.appId,
        playtimeForever: opts.playtimeForever,
        playtime2Weeks: opts.playtime2Weeks,
        lastPlayedAt: opts.lastPlayedAt,
        source: opts.source,
      },
    });
  }

  private async refreshMetadata(userId: string, opts?: SyncEnqueueOpts) {
    const entries = await this.prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { playtimeForever: "desc" },
    });
    // Prefer stale/missing metadata, then missing deck status, then playtime.
    const ranked = [...entries]
      .filter((e) => e.game.appId != null)
      .filter(
        (e) => opts?.force || !isMetadataFresh(e.game.metadataSyncedAt),
      )
      .sort((a, b) => {
        const aMissing = a.game.deckStatus ? 1 : 0;
        const bMissing = b.game.deckStatus ? 1 : 0;
        if (aMissing !== bMissing) return aMissing - bMissing;
        return (b.playtimeForever || 0) - (a.playtimeForever || 0);
      })
      .slice(0, 40);
    const refreshIds = ranked
      .map((e) => e.game.appId)
      .filter((id): id is number => id != null);
    const browseBatch =
      refreshIds.length > 0
        ? await this.steam.getStoreItems(refreshIds)
        : new Map();
    for (const entry of ranked) {
      if (entry.game.appId == null) continue;
      await this.enrichGame(
        entry.game.appId,
        undefined,
        browseBatch.get(entry.game.appId),
        { force: opts?.force },
      );
      await new Promise((r) => setTimeout(r, 180));
    }
    await this.syncLibraryPrices(userId, 60);
    // Advance Steam catalog a page or two in the background (non-fatal).
    void this.catalog.syncIncremental({ maxPages: 2, maxResults: 5000 }).catch(
      (err) => this.logger.warn(`Background catalog sync: ${err}`),
    );
  }

  async latestJobs(userId: string) {
    return this.prisma.syncJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}
