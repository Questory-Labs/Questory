import { Injectable } from "@nestjs/common";
import type { MultiplayerPlanSort } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SteamApiService } from "../steam/steam-api.service";
import { PlayerCountService } from "../steam/player-count.service";
import { parseStringArray, stringifyStringArray } from "../lib/json-arrays";
import {
  parseSteamReleaseDate,
  releaseYearFromDate,
} from "../lib/steam-dates";
import {
  parsePlayerMaxes,
  playerFilterMatches,
} from "../lib/player-counts";

export type PlanInput = {
  friendSteamIds: string[];
  minPlayers: number;
  maxPlayers: number;
  minYear: number;
  maxYear: number;
  mode?: "local_coop" | "online_coop" | "pvp" | "crossplay";
  genre?: string;
  sortBy: MultiplayerPlanSort;
  suggested?: boolean;
  /** When true, only games owned by you and every selected friend. */
  strictLibraryMatching?: boolean;
  controller?: boolean;
  steamDeck?: boolean;
};

type PlanGame = {
  appId: number;
  name: string;
  headerImage: string | null;
  genres: string[];
  categories: string[];
  deckStatus: string | null;
  yourPlaytimeMinutes?: number;
  playtime2Weeks?: number;
  releaseYear: number | null;
  reviewScore: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playerMaxes: number[];
  playerCountSource: string | null;
  isSuggested: boolean;
  ownedByYou: boolean;
  ownedByFriends: string[];
  missingFriends: string[];
  ownership: "shared" | "partial" | "unowned";
  trendingRank: number | null;
};

const MODE_MATCHERS: Record<string, RegExp> = {
  local_coop: /local co-op|shared\/split|local multi/i,
  online_coop: /online co-op|co-op/i,
  pvp: /pvp|versus|competitive/i,
  crossplay: /cross.?play/i,
};

const MODE_STORE_CATEGORY2: Record<string, number[]> = {
  local_coop: [37, 39],
  online_coop: [36, 9],
  pvp: [49, 38],
  crossplay: [1],
};

const GENRE_TAG_IDS: Record<string, number> = {
  action: 19,
  adventure: 21,
  casual: 597,
  indie: 492,
  rpg: 122,
  simulation: 599,
  strategy: 9,
  sports: 701,
  racing: 699,
  "massively multiplayer": 128,
};

function hasMultiplayerSignal(
  categories: string[],
  multiplayerCaps: string[],
  tags: string[],
): boolean {
  if (multiplayerCaps.length > 0) return true;
  const cats = [...categories, ...tags].join(" ");
  if (/multi|co-op|pvp|shared|cross.?play/i.test(cats)) return true;
  return categories.length === 0 && multiplayerCaps.length === 0;
}

function nullsLastDesc(a: number | null | undefined, b: number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function nullsLastAsc(a: number | null | undefined, b: number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

@Injectable()
export class MultiplayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly playerCounts: PlayerCountService,
  ) {}

  async plan(userId: string, input: PlanInput) {
    const minPlayers = Math.min(input.minPlayers, input.maxPlayers);
    const maxPlayers = Math.max(input.minPlayers, input.maxPlayers);
    const minYear = Math.min(input.minYear, input.maxYear);
    const maxYear = Math.max(input.minYear, input.maxYear);

    const yourLibrary = (
      await this.prisma.libraryEntry.findMany({
        where: { userId },
        include: { game: true },
      })
    ).filter((e): e is typeof e & { game: { appId: number } } => e.game.appId != null);
    const yourAppIds = new Set(yourLibrary.map((e) => e.game.appId));

    const friendships = input.friendSteamIds.length
      ? await this.prisma.friendship.findMany({
          where: {
            userId,
            friendSteamId: { in: input.friendSteamIds },
          },
        })
      : [];
    const friendNames = new Map(
      friendships.map((f) => [f.friendSteamId, f.personaName]),
    );

    const friendOwned = new Map<string, Set<number>>();
    for (const friendSteamId of input.friendSteamIds) {
      const rows = await this.prisma.friendLibraryCache.findMany({
        where: { ownerSteamId: friendSteamId },
        select: { gameAppId: true },
      });
      friendOwned.set(friendSteamId, new Set(rows.map((r) => r.gameAppId)));
    }

    const strictLibraryMatching = Boolean(input.strictLibraryMatching);
    let candidateAppIds = new Set(yourAppIds);
    if (strictLibraryMatching) {
      for (const set of friendOwned.values()) {
        candidateAppIds = new Set(
          [...candidateAppIds].filter((id) => set.has(id)),
        );
      }
    }

    const sharedCandidates = yourLibrary.filter(
      (e) =>
        candidateAppIds.has(e.game.appId) &&
        this.matchesFilters(
          e.game,
          { minPlayers: null, maxPlayers: null },
          input,
          minPlayers,
          maxPlayers,
          minYear,
          maxYear,
          true,
          false,
        ),
    );

    await this.backfillPlayerCounts(
      sharedCandidates.map((e) => e.game),
      input.mode,
    );

    // Re-read games after backfill so min/max are current.
    const refreshed = await this.prisma.game.findMany({
      where: {
        appId: {
          in: sharedCandidates
            .map((e) => e.game.appId)
            .filter((id): id is number => id != null),
        },
      },
    });
    const gameByAppId = new Map(
      refreshed
        .filter((g): g is typeof g & { appId: number } => g.appId != null)
        .map((g) => [g.appId, g]),
    );

    const sharedGames: PlanGame[] = [];
    for (const e of sharedCandidates) {
      const g = gameByAppId.get(e.game.appId) || e.game;
      const playerMaxes = parsePlayerMaxes(g.playerMaxes);
      const counts = {
        minPlayers: g.minPlayers ?? null,
        maxPlayers: g.maxPlayers ?? null,
        playerMaxes:
          playerMaxes.length > 0
            ? playerMaxes
            : g.maxPlayers != null
              ? [g.maxPlayers]
              : [],
      };
      if (
        !this.matchesFilters(
          g,
          counts,
          input,
          minPlayers,
          maxPlayers,
          minYear,
          maxYear,
          true,
          true,
        )
      ) {
        continue;
      }
      const ownedByFriends = input.friendSteamIds
        .filter((id) => friendOwned.get(id)?.has(e.game.appId))
        .map((id) => friendNames.get(id) || id);
      const missingFriends = input.friendSteamIds
        .filter((id) => !friendOwned.get(id)?.has(e.game.appId))
        .map((id) => friendNames.get(id) || id);
      const allFriendsOwn =
        input.friendSteamIds.length === 0 || missingFriends.length === 0;
      // Library candidates are always owned by you.
      const ownership: PlanGame["ownership"] = allFriendsOwn
        ? "shared"
        : "partial";
      sharedGames.push({
        appId: g.appId,
        name: g.name,
        headerImage: g.headerImage,
        genres: parseStringArray(g.genres),
        categories: parseStringArray(g.categories),
        deckStatus: g.deckStatus,
        yourPlaytimeMinutes: e.playtimeForever,
        playtime2Weeks: e.playtime2Weeks ?? 0,
        releaseYear: releaseYearFromDate(g.releaseDate),
        reviewScore: g.reviewScore,
        minPlayers: counts.minPlayers,
        maxPlayers: counts.maxPlayers,
        playerMaxes: counts.playerMaxes,
        playerCountSource: g.playerCountSource ?? null,
        isSuggested: false,
        ownedByYou: true,
        ownedByFriends,
        missingFriends,
        ownership,
        trendingRank: null,
      });
    }

    const games: PlanGame[] = [...sharedGames];
    const seen = new Set(sharedGames.map((g) => g.appId));

    if (input.suggested) {
      const trending = await this.fetchSuggested(input);
      await this.backfillPlayerCounts(
        (
          await Promise.all(
            trending.map(async (item) => {
              const db = await this.prisma.game.findFirst({
                where: { appId: item.appId },
              });
              return (
                db || {
                  appId: item.appId,
                  minPlayers: null as number | null,
                  maxPlayers: null as number | null,
                  playerMaxes: "[]",
                  playerCountSource: null as string | null,
                  playerCountSyncedAt: null as Date | null,
                  tags: stringifyStringArray(item.tags),
                  categories: stringifyStringArray(item.categories),
                }
              );
            }),
          )
        ).map((g) => ({
          ...g,
          appId: g.appId as number,
        })),
        input.mode,
      );

      for (const [rank, item] of trending.entries()) {
        if (seen.has(item.appId)) continue;

        const dbGame = await this.prisma.game.findFirst({
          where: { appId: item.appId },
        });

        const genres = dbGame ? parseStringArray(dbGame.genres) : item.genres;
        const categories = dbGame
          ? parseStringArray(dbGame.categories)
          : item.categories;
        const tags = dbGame ? parseStringArray(dbGame.tags) : item.tags;
        const multiplayerCaps = dbGame
          ? parseStringArray(dbGame.multiplayerCaps)
          : [];
        const controllers = dbGame
          ? parseStringArray(dbGame.controllers)
          : [];
        const deckStatus = dbGame?.deckStatus ?? null;
        const releaseYear =
          releaseYearFromDate(dbGame?.releaseDate) ?? item.releaseYear;
        const reviewScore = dbGame?.reviewScore ?? item.reviewScore;
        const suggestedMaxes = parsePlayerMaxes(dbGame?.playerMaxes);
        const counts = {
          minPlayers: dbGame?.minPlayers ?? null,
          maxPlayers: dbGame?.maxPlayers ?? null,
          playerMaxes:
            suggestedMaxes.length > 0
              ? suggestedMaxes
              : dbGame?.maxPlayers != null
                ? [dbGame.maxPlayers]
                : [],
        };

        const pseudo = {
          genres: stringifyStringArray(genres),
          categories: stringifyStringArray(categories),
          tags: stringifyStringArray(tags),
          multiplayerCaps: stringifyStringArray(multiplayerCaps),
          controllers: stringifyStringArray(controllers),
          deckStatus,
          releaseDate: releaseYear
            ? new Date(Date.UTC(releaseYear, 0, 1))
            : null,
          reviewScore,
        };

        if (
          !this.matchesFilters(
            pseudo,
            counts,
            input,
            minPlayers,
            maxPlayers,
            minYear,
            maxYear,
            true,
            true,
          )
        ) {
          continue;
        }

        const ownedByYou = yourAppIds.has(item.appId);
        const ownedByFriends = input.friendSteamIds
          .filter((id) => friendOwned.get(id)?.has(item.appId))
          .map((id) => friendNames.get(id) || id);
        const missingFriends = input.friendSteamIds
          .filter((id) => !friendOwned.get(id)?.has(item.appId))
          .map((id) => friendNames.get(id) || id);

        const allFriendsOwn =
          input.friendSteamIds.length === 0 || missingFriends.length === 0;
        const ownership: PlanGame["ownership"] =
          ownedByYou && allFriendsOwn
            ? "shared"
            : ownedByYou || ownedByFriends.length > 0
              ? "partial"
              : "unowned";

        if (ownership === "shared") continue;

        const ownedEntry = ownedByYou
          ? yourLibrary.find((e) => e.game.appId === item.appId)
          : undefined;
        games.push({
          appId: item.appId,
          name: dbGame?.name || item.name,
          headerImage: dbGame?.headerImage || item.headerImage,
          genres,
          categories,
          deckStatus,
          yourPlaytimeMinutes: ownedEntry?.playtimeForever,
          playtime2Weeks: ownedEntry?.playtime2Weeks ?? 0,
          releaseYear,
          reviewScore,
          minPlayers: counts.minPlayers,
          maxPlayers: counts.maxPlayers,
          playerMaxes: counts.playerMaxes,
          playerCountSource: dbGame?.playerCountSource ?? null,
          isSuggested: true,
          ownedByYou,
          ownedByFriends,
          missingFriends,
          ownership,
          trendingRank: rank,
        });
        seen.add(item.appId);
      }
    }

    this.sortGames(games, input.sortBy);

    return {
      minPlayers,
      maxPlayers,
      minYear,
      maxYear,
      sortBy: input.sortBy,
      friendCount: input.friendSteamIds.length,
      games: games
        .slice(0, 60)
        .map(({ playtime2Weeks: _p, trendingRank: _t, ...g }) => g),
    };
  }

  private async backfillPlayerCounts(
    games: Array<{
      appId: number;
      minPlayers?: number | null;
      maxPlayers?: number | null;
      playerMaxes?: string | null;
      playerCountSource?: string | null;
      playerCountSyncedAt?: Date | null;
      tags?: string;
      categories?: string;
    }>,
    preferredMode?: PlanInput["mode"],
  ) {
    // Cap IGDB work per plan request; throttle lives in IgdbService.
    const pending = games.slice(0, 40);
    for (const g of pending) {
      await this.playerCounts.resolveForSteamApp(g.appId, {
        preferredMode,
        game: g,
      });
    }
  }

  private sortGames(games: PlanGame[], sortBy: MultiplayerPlanSort) {
    games.sort((a, b) => {
      const suggestedCmp = Number(a.isSuggested) - Number(b.isSuggested);

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) || suggestedCmp;
        case "release":
          return nullsLastDesc(a.releaseYear, b.releaseYear) || suggestedCmp;
        case "review":
          return nullsLastDesc(a.reviewScore, b.reviewScore) || suggestedCmp;
        case "trending": {
          const byRank = nullsLastAsc(a.trendingRank, b.trendingRank);
          if (byRank !== 0) return byRank;
          return (
            nullsLastDesc(a.playtime2Weeks, b.playtime2Weeks) ||
            nullsLastDesc(a.yourPlaytimeMinutes, b.yourPlaytimeMinutes) ||
            suggestedCmp
          );
        }
        case "popularity":
        default:
          return (
            nullsLastDesc(a.yourPlaytimeMinutes, b.yourPlaytimeMinutes) ||
            nullsLastDesc(a.reviewScore, b.reviewScore) ||
            suggestedCmp
          );
      }
    });
  }

  private matchesFilters(
    game: {
      genres: string;
      categories: string;
      tags?: string;
      multiplayerCaps?: string;
      controllers?: string;
      deckStatus?: string | null;
      releaseDate?: Date | string | null;
    },
    counts: {
      minPlayers: number | null;
      maxPlayers: number | null;
      playerMaxes?: number[];
    },
    input: PlanInput,
    minPlayers: number,
    maxPlayers: number,
    minYear: number,
    maxYear: number,
    requireMpSignal = true,
    applyPlayerFilter = true,
  ): boolean {
    const categories = parseStringArray(game.categories);
    const multiplayerCaps = parseStringArray(game.multiplayerCaps || "[]");
    const tags = parseStringArray(game.tags || "[]");
    const genres = parseStringArray(game.genres);
    const controllers = parseStringArray(game.controllers || "[]");
    const cats = [...categories, ...multiplayerCaps, ...tags].join(" ");

    if (
      requireMpSignal &&
      !hasMultiplayerSignal(categories, multiplayerCaps, tags)
    ) {
      return false;
    }

    if (input.mode) {
      const re = MODE_MATCHERS[input.mode];
      if (
        re &&
        categories.length + multiplayerCaps.length > 0 &&
        !re.test(cats)
      ) {
        return false;
      }
    }

    if (input.genre) {
      const want = input.genre.toLowerCase();
      if (!genres.some((x) => x.toLowerCase() === want)) return false;
    }

    if (input.controller && controllers.length === 0 && categories.length) {
      return false;
    }
    if (
      input.steamDeck &&
      game.deckStatus &&
      !["verified", "playable"].includes(game.deckStatus)
    ) {
      return false;
    }

    if (
      applyPlayerFilter &&
      !playerFilterMatches(
        counts.minPlayers,
        counts.maxPlayers,
        minPlayers,
        maxPlayers,
        counts.playerMaxes,
      )
    ) {
      return false;
    }

    const year = releaseYearFromDate(game.releaseDate ?? null);
    if (year != null && (year < minYear || year > maxYear)) {
      return false;
    }

    return true;
  }

  private async fetchSuggested(input: PlanInput) {
    const category2 = (input.mode && MODE_STORE_CATEGORY2[input.mode]) || [1];
    const genreKey = input.genre?.trim().toLowerCase() || "";
    const tagId = genreKey ? GENRE_TAG_IDS[genreKey] : undefined;

    const storeSort =
      input.sortBy === "release"
        ? "Released_DESC"
        : input.sortBy === "review"
          ? "Reviews_DESC"
          : input.sortBy === "name"
            ? "Name_ASC"
            : undefined;
    const filter =
      input.sortBy === "trending" ? "popularnew" : "globaltopsellers";

    const items = await this.steam.searchStoreGames({
      category2,
      tags: tagId ? [tagId] : undefined,
      filter,
      sortBy: storeSort,
      count: 40,
    });

    return Promise.all(
      items.map(async (item) => {
        const db = await this.prisma.game.findFirst({
          where: { appId: item.appId },
        });
        if (db?.metadataSyncedAt) {
          return {
            appId: item.appId,
            name: db.name,
            headerImage: db.headerImage,
            genres: parseStringArray(db.genres),
            categories: parseStringArray(db.categories),
            tags: parseStringArray(db.tags),
            releaseYear: releaseYearFromDate(db.releaseDate),
            reviewScore: db.reviewScore,
          };
        }

        const [details, tagNames] = await Promise.all([
          this.steam.getAppDetails(item.appId),
          this.steam.getAppTagNames(item.appId),
        ]);
        const releaseDate = parseSteamReleaseDate(details?.release_date?.date);
        let reviewScore: number | null = null;
        if (input.sortBy === "review") {
          const reviews = await this.steam.getAppReviews(item.appId);
          reviewScore = reviews?.score ?? null;
        }

        return {
          appId: item.appId,
          name: details?.name || item.name,
          headerImage: details?.header_image || item.headerImage,
          genres: (details?.genres || []).map((g) => g.description),
          categories: (details?.categories || []).map((c) => c.description),
          tags: tagNames,
          releaseYear: releaseYearFromDate(releaseDate),
          reviewScore,
        };
      }),
    );
  }
}
