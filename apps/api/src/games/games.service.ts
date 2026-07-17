import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SteamApiService } from "../steam/steam-api.service";
import { ItadService } from "../steam/itad.service";
import { HltbService } from "../steam/hltb.service";
import { PlayerCountService } from "../steam/player-count.service";
import { ConcurrentPlayersService } from "../steam/concurrent-players.service";
import {
  parseStringArray,
  stringifyStringArray,
} from "../lib/json-arrays";
import { parsePlayerMaxes } from "../lib/player-counts";
import {
  currencyFromCountry,
  normalizePriceCountry,
} from "../lib/currency";

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly itad: ItadService,
    private readonly hltb: HltbService,
    private readonly playerCounts: PlayerCountService,
    private readonly concurrentPlayers: ConcurrentPlayersService,
  ) {}

  async detail(userId: string, appId: number) {
    if (!Number.isFinite(appId) || appId <= 0) {
      throw new BadRequestException("Invalid appId");
    }

    const viewer = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    let game = await this.prisma.game.findFirst({ where: { appId } });
    const libraryEntry = await this.prisma.libraryEntry.findFirst({
      where: { userId, game: { appId } },
      include: { game: true },
    });

    if (!game && libraryEntry) game = libraryEntry.game;

    let name = game?.name || `App ${appId}`;
    let headerImage =
      game?.headerImage || this.steam.headerImageFromAppId(appId);

    if (!game) {
      const details = await this.steam.getAppDetails(
        appId,
        viewer.countryCode,
      );
      if (!details) throw new NotFoundException("Game not found");
      name = details.name;
      headerImage = details.header_image || headerImage;
    }

    if (game && !parseStringArray(game.tags).length) {
      const fetchedTags = await this.steam.getAppTagNames(appId);
      await this.prisma.game
        .update({
          where: { id: game.id },
          data: { tags: stringifyStringArray(fetchedTags) },
        })
        .catch(() => undefined);
      game = { ...game, tags: stringifyStringArray(fetchedTags) };
    }

    if (game && !game.deckStatus) {
      const deckStatus = await this.steam.getDeckCompatibility(appId);
      if (deckStatus) {
        await this.prisma.game
          .update({
            where: { id: game.id },
            data: { deckStatus },
          })
          .catch(() => undefined);
        game = { ...game, deckStatus };
      }
    }

    const counts = await this.playerCounts.resolveForSteamApp(appId, {
      game,
    });
    game = await this.prisma.game.findFirst({ where: { appId } });

    const genres = game ? parseStringArray(game.genres) : [];
    const categories = game ? parseStringArray(game.categories) : [];
    const tags = game ? parseStringArray(game.tags) : [];
    const minPlayers = counts?.minPlayers ?? game?.minPlayers ?? null;
    const maxPlayers = counts?.maxPlayers ?? game?.maxPlayers ?? null;
    const fromDb = parsePlayerMaxes(game?.playerMaxes);
    const playerMaxes =
      counts?.playerMaxes?.length
        ? counts.playerMaxes
        : fromDb.length
          ? fromDb
          : maxPlayers != null
            ? [maxPlayers]
            : [];
    const playerCountSource =
      counts?.source ??
      (game?.playerCountSource as "igdb" | "steam_tag" | null) ??
      null;

    if (game?.name) name = game.name;
    if (game?.headerImage) headerImage = game.headerImage;

    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
    });
    const friendSteamIds = friendships.map((f) => f.friendSteamId);
    const friendCaches = friendSteamIds.length
      ? await this.prisma.friendLibraryCache.findMany({
          where: {
            ownerSteamId: { in: friendSteamIds },
            gameAppId: appId,
          },
        })
      : [];
    const friendCacheMap = new Map(
      friendCaches.map((c) => [c.ownerSteamId, c]),
    );

    const friendOwners = friendships
      .filter((f) => friendCacheMap.has(f.friendSteamId))
      .map((f) => {
        const cache = friendCacheMap.get(f.friendSteamId)!;
        return {
          steamId: f.friendSteamId,
          personaName: f.personaName,
          avatarUrl: f.avatarUrl,
          playtimeForever: cache.playtimeForever,
          playtimeHours: Math.round((cache.playtimeForever / 60) * 10) / 10,
        };
      })
      .sort((a, b) => b.playtimeForever - a.playtimeForever);

    const country = normalizePriceCountry(viewer.countryCode) || "US";
    const [
      prices,
      history,
      reviews,
      hltb,
      onlinePlayers,
      news,
      globalAchievements,
      schema,
      dlc,
      reviewHistogram,
      details,
    ] = await Promise.all([
      this.itad.getSteamPrices([appId], country),
      this.itad.getSteamPriceHistory(appId, country),
      this.steam.getAppReviews(appId),
      this.hltb.lookup(name),
      this.concurrentPlayers.getForApp(appId),
      this.steam.getNewsForApp(appId, 6, 280),
      this.steam.getGlobalAchievementPercentages(appId),
      this.steam.getSchemaForGame(appId),
      this.steam.getDlcForApp(appId),
      this.steam.getReviewHistogram(appId),
      this.steam.getAppDetails(appId, country),
    ]);

    const packageIds = (details?.packages || []).slice(0, 8);
    const packageMap = packageIds.length
      ? await this.steam.getPackageDetails(packageIds, country)
      : new Map();
    const packages = [...packageMap.values()].map((p) => ({
      packageId: p.packageId,
      name: p.name,
      headerImage: p.headerImage,
      finalPrice: p.price?.final ?? null,
      currency: p.price?.currency ?? null,
      discountPercent: p.price?.discountPercent ?? 0,
      appCount: p.apps.length,
    }));

    const globalByName = new Map(
      globalAchievements.map((a) => [a.name, a.percent]),
    );
    const achievementRows = (schema?.achievements || [])
      .map((a) => ({
        name: a.name,
        displayName: a.displayName,
        description: a.description,
        percent: globalByName.get(a.name) ?? 0,
        icon: a.icon || null,
        unlocked: null as boolean | null,
      }))
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 12);

    // If schema missing, still surface rarest global % names.
    const achievementsFallback =
      !achievementRows.length && globalAchievements.length
        ? [...globalAchievements]
            .sort((a, b) => a.percent - b.percent)
            .slice(0, 12)
            .map((a) => ({
              name: a.name,
              displayName: a.name,
              description: "",
              percent: a.percent,
              icon: null as string | null,
              unlocked: null as boolean | null,
            }))
        : achievementRows;

    const itadPrice = prices[appId] || { current: null, lowest: null };
    const currentPrice = itadPrice.current ?? game?.currentPrice ?? null;
    const lowestPrice =
      itadPrice.lowest ?? history.historicalLow ?? game?.lowestPrice ?? null;

    if (reviews?.score != null && game) {
      await this.prisma.game
        .update({
          where: { id: game.id },
          data: { reviewScore: reviews.score },
        })
        .catch(() => undefined);
    }

    const youOwn = Boolean(libraryEntry);
    const yourPlaytimeHours = libraryEntry
      ? Math.round((libraryEntry.playtimeForever / 60) * 10) / 10
      : null;

    const histogram = reviewHistogram.slice(-36).map((h) => ({
      date: h.date,
      recommendationsUp: h.recommendationsUp,
      recommendationsDown: h.recommendationsDown,
    }));

    return {
      appId,
      name,
      headerImage,
      genres,
      categories,
      tags,
      developers: game ? parseStringArray(game.developers) : [],
      publishers: game ? parseStringArray(game.publishers) : [],
      deckStatus: game?.deckStatus ?? null,
      releaseDate: game?.releaseDate?.toISOString() ?? null,
      isFree: game?.isFree ?? false,
      minPlayers,
      maxPlayers,
      playerMaxes: playerMaxes.length ? playerMaxes : null,
      playerCountSource,
      onlinePlayers,
      youOwn,
      yourPlaytimeHours,
      friendOwners,
      price: {
        current: currentPrice,
        lowest: lowestPrice,
        historicalLow: history.historicalLow ?? lowestPrice,
        historicalHigh: history.historicalHigh,
        currency: currencyFromCountry(viewer.countryCode),
        history: history.history,
      },
      review: reviews
        ? {
            score: reviews.score,
            description: reviews.description,
            totalPositive: reviews.totalPositive,
            totalNegative: reviews.totalNegative,
            totalReviews: reviews.totalReviews,
            storedScore: game?.reviewScore ?? reviews.score,
            histogram,
          }
        : game?.reviewScore != null
          ? {
              score: game.reviewScore,
              description: null,
              totalPositive: 0,
              totalNegative: 0,
              totalReviews: 0,
              storedScore: game.reviewScore,
              histogram,
            }
          : histogram.length
            ? {
                score: null,
                description: null,
                totalPositive: 0,
                totalNegative: 0,
                totalReviews: 0,
                storedScore: null,
                histogram,
              }
            : null,
      hltb,
      news,
      achievements:
        libraryEntry || achievementsFallback.length
          ? {
              unlocked: libraryEntry?.achievementUnlocked ?? null,
              total: libraryEntry?.achievementTotal ?? null,
              pct: libraryEntry?.achievementPct ?? null,
              global: achievementsFallback,
            }
          : null,
      dlc: dlc.slice(0, 24),
      packages,
    };
  }
}
