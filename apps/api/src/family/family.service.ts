import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SteamApiService } from "../steam/steam-api.service";
import { ItadService } from "../steam/itad.service";
import { HltbService } from "../steam/hltb.service";
import { ConcurrentPlayersService } from "../steam/concurrent-players.service";
import { parseStringArray } from "../lib/json-arrays";
import { parsePlayerMaxes } from "../lib/player-counts";
import {
  currencyFromCountry,
  normalizePriceCountry,
} from "../lib/currency";

type MemberGame = {
  appId: number;
  name: string;
  headerImage: string | null;
  playtimeForever: number;
  /** Recorded pricePaid when set, else current store price (Cost-style). */
  priceValue: number;
};

type MemberLibrary = {
  steamId: string;
  personaName: string;
  avatarUrl: string | null;
  role: string;
  userId: string | null;
  games: Map<number, MemberGame>;
  /** Recorded pricePaid when set, else current store price (Cost-style). */
  libraryValue: number;
};

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly itad: ItadService,
    private readonly hltb: HltbService,
    private readonly concurrentPlayers: ConcurrentPlayersService,
  ) {}

  async getOrCreate(userId: string) {
    let group = await this.prisma.familyGroup.findFirst({
      where: { ownerId: userId },
      include: { members: true },
    });
    if (!group) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      group = await this.prisma.familyGroup.create({
        data: {
          ownerId: userId,
          name: "My Family",
          members: {
            create: {
              userId: user.id,
              steamId: user.steamId,
              personaName: user.personaName,
              avatarUrl: user.avatarUrl,
              role: "owner",
            },
          },
        },
        include: { members: true },
      });
    } else {
      await this.refreshMemberProfiles(group.id, group.members);
      group = await this.prisma.familyGroup.findFirstOrThrow({
        where: { id: group.id },
        include: { members: true },
      });
    }
    return group;
  }

  async addMember(userId: string, steamId: string) {
    const id = steamId.trim();
    if (!/^\d{17}$/.test(id)) {
      throw new BadRequestException("SteamID64 must be a 17-digit number");
    }

    const group = await this.getOrCreate(userId);
    const [summary] = await this.steam.getPlayerSummaries([id]);
    return this.upsertMember(
      group.id,
      id,
      {
        personaName: summary?.personaname || id,
        avatarUrl: summary?.avatarfull || null,
      },
      { syncLibrary: true },
    );
  }

  /** Import selected Steam friends into the family group (must already be friendships). */
  async importFromFriends(userId: string, steamIds: string[]) {
    const ids = [
      ...new Set((steamIds || []).map((s) => s.trim()).filter(Boolean)),
    ];
    if (!ids.length) {
      throw new BadRequestException("Select at least one friend");
    }
    if (ids.length > 25) {
      throw new BadRequestException("Import at most 25 friends at a time");
    }
    if (ids.some((id) => !/^\d{17}$/.test(id))) {
      throw new BadRequestException("All SteamIDs must be 17-digit numbers");
    }

    const group = await this.getOrCreate(userId);
    const friends = await this.prisma.friendship.findMany({
      where: { userId, friendSteamId: { in: ids } },
    });
    const friendMap = new Map(friends.map((f) => [f.friendSteamId, f]));

    const added: Awaited<ReturnType<typeof this.upsertMember>>[] = [];
    const skipped: string[] = [];

    for (const steamId of ids) {
      const friend = friendMap.get(steamId);
      if (!friend) {
        skipped.push(steamId);
        continue;
      }
      // Skip full library pull here — friends-sync cache + insights refresh cover it.
      const member = await this.upsertMember(
        group.id,
        steamId,
        {
          personaName: friend.personaName,
          avatarUrl: friend.avatarUrl,
          userId: friend.friendUserId,
        },
        { syncLibrary: false },
      );
      added.push(member);
    }

    return {
      added: added.length,
      skipped: skipped.length,
      members: added,
    };
  }

  private async upsertMember(
    groupId: string,
    steamId: string,
    profile: {
      personaName: string;
      avatarUrl: string | null;
      userId?: string | null;
    },
    opts: { syncLibrary: boolean },
  ) {
    const existingUser =
      profile.userId != null
        ? { id: profile.userId }
        : await this.prisma.user.findUnique({ where: { steamId } });

    const member = await this.prisma.familyMember.upsert({
      where: { groupId_steamId: { groupId, steamId } },
      create: {
        groupId,
        steamId,
        userId: existingUser?.id,
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
        role: "member",
      },
      update: {
        userId: existingUser?.id,
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
      },
    });

    // Non-users need a library cache; users already sync via LibraryEntry.
    if (!existingUser && opts.syncLibrary) {
      await this.cacheMemberLibrary(steamId);
    }

    return member;
  }

  private isFallbackName(personaName: string, steamId: string) {
    return (
      personaName === steamId ||
      personaName === `Steam ${steamId}` ||
      /^Steam \d{17}$/.test(personaName)
    );
  }

  /** Pull fresh persona names/avatars for members (esp. fallback Steam ID labels). */
  private async refreshMemberProfiles(
    _groupId: string,
    members: {
      id: string;
      steamId: string;
      userId: string | null;
      personaName: string;
      avatarUrl: string | null;
      role: string;
    }[],
  ) {
    const steamIds = members.map((m) => m.steamId);
    const summaries = await this.steam.getPlayerSummaries(steamIds);
    const summaryMap = new Map(summaries.map((s) => [s.steamid, s]));

    for (const member of members) {
      const summary = summaryMap.get(member.steamId);
      const linkedUser = member.userId
        ? await this.prisma.user.findUnique({ where: { id: member.userId } })
        : await this.prisma.user.findUnique({
            where: { steamId: member.steamId },
          });

      const nextName =
        summary?.personaname ||
        (linkedUser &&
        !this.isFallbackName(linkedUser.personaName, member.steamId)
          ? linkedUser.personaName
          : null) ||
        member.personaName;
      const avatarUrl =
        summary?.avatarfull || linkedUser?.avatarUrl || member.avatarUrl;

      if (
        nextName !== member.personaName ||
        avatarUrl !== member.avatarUrl ||
        (linkedUser && member.userId !== linkedUser.id)
      ) {
        await this.prisma.familyMember.update({
          where: { id: member.id },
          data: {
            personaName: nextName,
            avatarUrl,
            userId: linkedUser?.id ?? member.userId,
          },
        });
      }

      // Keep linked User row in sync when Steam returns a real name.
      if (
        linkedUser &&
        summary?.personaname &&
        linkedUser.personaName !== summary.personaname
      ) {
        await this.prisma.user.update({
          where: { id: linkedUser.id },
          data: {
            personaName: summary.personaname,
            avatarUrl: summary.avatarfull || linkedUser.avatarUrl,
          },
        });
      }
    }
  }

  /** Fetch full owned-games list into FriendLibraryCache (not the friends-sync 200 cap). */
  private async cacheMemberLibrary(steamId: string): Promise<number> {
    const owned = await this.steam.getOwnedGames(steamId);
    if (!owned.length) return 0;

    for (const g of owned) {
      await this.prisma.friendLibraryCache.upsert({
        where: {
          ownerSteamId_gameAppId: {
            ownerSteamId: steamId,
            gameAppId: g.appid,
          },
        },
        create: {
          ownerSteamId: steamId,
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
    return owned.length;
  }

  private async loadCachedLibrary(steamId: string) {
    let cache = await this.prisma.friendLibraryCache.findMany({
      where: { ownerSteamId: steamId },
    });

    // Empty or friends-sync truncated (200) → pull the full library.
    if (cache.length === 0 || cache.length === 200) {
      await this.cacheMemberLibrary(steamId);
      cache = await this.prisma.friendLibraryCache.findMany({
        where: { ownerSteamId: steamId },
      });
    }

    return cache;
  }

  private gamePriceValue(game: {
    isFree: boolean;
    currentPrice: number | null;
  }, pricePaid?: number | null): number {
    if (pricePaid != null) return pricePaid;
    if (game.isFree) return 0;
    return game.currentPrice ?? 0;
  }

  private async loadMemberLibraries(
    group: {
      members: {
        steamId: string;
        personaName: string;
        avatarUrl: string | null;
        role: string;
        userId: string | null;
      }[];
    },
  ): Promise<MemberLibrary[]> {
    const memberLibraries: MemberLibrary[] = [];

    for (const member of group.members) {
      if (member.userId) {
        const lib = await this.prisma.libraryEntry.findMany({
          where: { userId: member.userId },
          include: { game: true },
        });
        const games = new Map<number, MemberGame>();
        let libraryValue = 0;
        for (const e of lib) {
          if (e.game.appId == null) continue;
          const priceValue = this.gamePriceValue(e.game, e.pricePaid);
          games.set(e.game.appId, {
            appId: e.game.appId,
            name: e.game.name,
            headerImage: e.game.headerImage,
            playtimeForever: e.playtimeForever,
            priceValue,
          });
          libraryValue += priceValue;
        }
        memberLibraries.push({
          steamId: member.steamId,
          personaName: member.personaName,
          avatarUrl: member.avatarUrl,
          role: member.role,
          userId: member.userId,
          games,
          libraryValue,
        });
      } else {
        const cache = await this.loadCachedLibrary(member.steamId);
        const games = new Map<number, MemberGame>();
        for (const e of cache) {
          games.set(e.gameAppId, {
            appId: e.gameAppId,
            name: e.gameName || `App ${e.gameAppId}`,
            headerImage:
              e.headerImage || this.steam.headerImageFromAppId(e.gameAppId),
            playtimeForever: e.playtimeForever,
            priceValue: 0,
          });
        }
        const appIds = [...games.keys()];
        const priced = appIds.length
          ? await this.prisma.game.findMany({
              where: { appId: { in: appIds } },
              select: { appId: true, isFree: true, currentPrice: true },
            })
          : [];
        const priceByApp = new Map(
          priced
            .filter((g): g is typeof g & { appId: number } => g.appId != null)
            .map((g) => [g.appId, g]),
        );
        let libraryValue = 0;
        for (const appId of appIds) {
          const meta = priceByApp.get(appId);
          const priceValue = meta ? this.gamePriceValue(meta) : 0;
          const game = games.get(appId);
          if (game) game.priceValue = priceValue;
          libraryValue += priceValue;
        }
        memberLibraries.push({
          steamId: member.steamId,
          personaName: member.personaName,
          avatarUrl: member.avatarUrl,
          role: member.role,
          userId: null,
          games,
          libraryValue,
        });
      }
    }

    return memberLibraries;
  }

  private isShareableGame(meta: {
    isFree: boolean;
    categories: string[];
  } | null): boolean {
    // Family shareable pool ≈ paid (or unknown) titles owned by the group.
    // Free-to-play is almost never shareable; explicit Family Sharing wins.
    if (!meta) return true;
    if (meta.categories.some((c) => /family sharing/i.test(c))) return true;
    if (meta.isFree) return false;
    return true;
  }

  async insights(userId: string) {
    const group = await this.getOrCreate(userId);
    const viewer = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const memberLibraries = await this.loadMemberLibraries(group);

    const ownership = new Map<number, string[]>();
    const nameByAppId = new Map<number, string>();
    for (const m of memberLibraries) {
      for (const [appId, game] of m.games) {
        const owners = ownership.get(appId) || [];
        owners.push(m.personaName);
        ownership.set(appId, owners);
        if (!nameByAppId.has(appId)) nameByAppId.set(appId, game.name);
      }
    }

    const allConflicts = [...ownership.entries()]
      .filter(([, owners]) => owners.length > 1)
      .sort(
        (a, b) =>
          b[1].length - a[1].length ||
          (nameByAppId.get(a[0]) || "").localeCompare(
            nameByAppId.get(b[0]) || "",
          ),
      );

    const conflictSlice = allConflicts.slice(0, 30);
    const games = await this.prisma.game.findMany({
      where: { appId: { in: conflictSlice.map(([id]) => id) } },
    });
    const gameMap = new Map(
      games
        .filter((g): g is typeof g & { appId: number } => g.appId != null)
        .map((g) => [g.appId, g]),
    );

    const allUnique = new Set<number>();
    for (const m of memberLibraries) {
      for (const id of m.games.keys()) allUnique.add(id);
    }

    const wishlist = await this.prisma.wishlistItem.findMany({
      where: { userId },
    });

    // Prefer the member who can fill the most wishlist gaps (doesn't own them yet).
    let suggested: {
      steamId: string;
      personaName: string;
      reason: string;
    } | null = null;
    let bestScore = -1;
    for (const m of memberLibraries) {
      if (m.games.size === 0) continue;
      const missingWanted = wishlist.filter(
        (w) => w.appId != null && !m.games.has(w.appId),
      ).length;
      const score = missingWanted;
      if (score > bestScore) {
        bestScore = score;
        suggested = {
          steamId: m.steamId,
          personaName: m.personaName,
          reason:
            missingWanted > 0
              ? `Missing ${missingWanted} of your wishlist games — best next buyer`
              : "Largest library among members with full wishlist coverage",
        };
      }
    }
    if (!suggested && memberLibraries.length) {
      const owner =
        memberLibraries.find((m) => m.role === "owner") || memberLibraries[0];
      suggested = {
        steamId: owner.steamId,
        personaName: owner.personaName,
        reason: "Primary account for family purchases",
      };
    }

    // Unique catalog value across family sharing: one price per appId
    // (recorded pricePaid when set, else current store price).
    const uniquePriceByApp = new Map<number, number>();
    for (const m of memberLibraries) {
      for (const [appId, game] of m.games) {
        const existing = uniquePriceByApp.get(appId);
        if (existing == null || game.priceValue > existing) {
          uniquePriceByApp.set(appId, game.priceValue);
        }
      }
    }
    const familyValue = Math.round(
      [...uniquePriceByApp.values()].reduce((s, v) => s + v, 0),
    );

    const wishlistAppIds = wishlist
      .map((w) => w.appId)
      .filter((id): id is number => id != null);

    return {
      memberCount: group.members.length,
      totalUniqueGames: allUnique.size,
      overlapCount: allConflicts.length,
      duplicatePurchases: allConflicts.length,
      familyValue,
      currency: currencyFromCountry(viewer.countryCode),
      suggestedPurchaser: suggested,
      meSteamId: viewer.steamId,
      members: memberLibraries.map((m) => {
        let playtimeHours = 0;
        let unusedCount = 0;
        let sharedCount = 0;
        let uniqueCount = 0;
        for (const g of m.games.values()) {
          playtimeHours += g.playtimeForever / 60;
          if (g.playtimeForever === 0) unusedCount += 1;
          const owners = ownership.get(g.appId)?.length || 0;
          if (owners > 1) sharedCount += 1;
          else uniqueCount += 1;
        }
        const wishlistGaps = wishlistAppIds.filter(
          (appId) => !m.games.has(appId),
        ).length;
        return {
          steamId: m.steamId,
          personaName: m.personaName,
          avatarUrl: m.avatarUrl,
          role: m.role,
          isMe: m.steamId === viewer.steamId,
          librarySize: m.games.size,
          sharedCount,
          uniqueCount,
          trackedSpend: Math.round(m.libraryValue),
          wishlistGaps,
          playtimeHours: Math.round(playtimeHours * 10) / 10,
          unusedCount,
        };
      }),
      conflicts: conflictSlice.map(([appId, owners]) => ({
        appId,
        name:
          gameMap.get(appId)?.name ||
          nameByAppId.get(appId) ||
          `App ${appId}`,
        owners,
      })),
    };
  }

  async library(
    userId: string,
    opts: {
      memberSteamId?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const group = await this.getOrCreate(userId);
    const viewer = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const memberLibraries = await this.loadMemberLibraries(group);
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(96, Math.max(12, opts.pageSize || 48));
    const q = (opts.q || "").trim().toLowerCase();
    const memberFilter = opts.memberSteamId?.trim() || null;

    if (
      memberFilter &&
      !memberLibraries.some((m) => m.steamId === memberFilter)
    ) {
      throw new BadRequestException("Member is not in your family group");
    }

    type Agg = {
      appId: number;
      name: string;
      headerImage: string | null;
      ownerCount: number;
      owners: {
        steamId: string;
        personaName: string;
        avatarUrl: string | null;
        playtimeForever: number;
        isMe: boolean;
      }[];
      totalPlaytimeForever: number;
    };

    const byApp = new Map<number, Agg>();
    const sourceMembers = memberFilter
      ? memberLibraries.filter((m) => m.steamId === memberFilter)
      : memberLibraries;

    for (const m of sourceMembers) {
      for (const game of m.games.values()) {
        if (q && !game.name.toLowerCase().includes(q)) continue;
        if (!byApp.has(game.appId)) {
          byApp.set(game.appId, {
            appId: game.appId,
            name: game.name,
            headerImage: game.headerImage,
            ownerCount: 0,
            owners: [],
            totalPlaytimeForever: 0,
          });
        }
      }
    }

    // Attach full-family ownership for each listed game.
    for (const agg of byApp.values()) {
      for (const m of memberLibraries) {
        const owned = m.games.get(agg.appId);
        if (!owned) continue;
        agg.owners.push({
          steamId: m.steamId,
          personaName: m.personaName,
          avatarUrl: m.avatarUrl,
          playtimeForever: owned.playtimeForever,
          isMe: m.steamId === viewer.steamId,
        });
        agg.totalPlaytimeForever += owned.playtimeForever;
        if (!agg.headerImage && owned.headerImage) {
          agg.headerImage = owned.headerImage;
        }
        if (owned.name && agg.name.startsWith("App ")) agg.name = owned.name;
      }
      agg.ownerCount = agg.owners.length;
    }

    const appIds = [...byApp.keys()];
    const gameRows = await this.prisma.game.findMany({
      where: { appId: { in: appIds } },
    });
    const metaMap = new Map(
      gameRows.map((g) => [
        g.appId,
        {
          isFree: g.isFree,
          categories: parseStringArray(g.categories),
          headerImage: g.headerImage,
          name: g.name,
          currentPrice: g.currentPrice,
          lowestPrice: g.lowestPrice,
        },
      ]),
    );

    let items = [...byApp.values()]
      .map((agg) => {
        const meta = metaMap.get(agg.appId) || null;
        return {
          ...agg,
          name: meta?.name || agg.name,
          headerImage: meta?.headerImage || agg.headerImage,
          currentPrice: meta?.currentPrice ?? null,
          lowestPrice: meta?.lowestPrice ?? null,
          isFamilyShareable: this.isShareableGame(
            meta
              ? { isFree: meta.isFree, categories: meta.categories }
              : null,
          ),
        };
      })
      .filter((g) => g.isFamilyShareable);

    items.sort(
      (a, b) =>
        b.ownerCount - a.ownerCount ||
        b.totalPlaytimeForever - a.totalPlaytimeForever ||
        a.name.localeCompare(b.name),
    );

    const total = items.length;
    const start = (page - 1) * pageSize;
    items = items.slice(start, start + pageSize);

    return {
      total,
      page,
      pageSize,
      meSteamId: viewer.steamId,
      members: memberLibraries.map((m) => ({
        steamId: m.steamId,
        personaName: m.personaName,
        avatarUrl: m.avatarUrl,
        role: m.role,
        isMe: m.steamId === viewer.steamId,
        librarySize: m.games.size,
      })),
      items: items.map((g) => ({
        appId: g.appId,
        name: g.name,
        headerImage: g.headerImage,
        ownerCount: g.ownerCount,
        owners: g.owners.map((o) => ({
          steamId: o.steamId,
          personaName: o.personaName,
          avatarUrl: o.avatarUrl,
          isMe: o.isMe,
        })),
        familyPlaytimeHours:
          Math.round((g.totalPlaytimeForever / 60) * 10) / 10,
        currentPrice: g.currentPrice,
        lowestPrice: g.lowestPrice,
      })),
    };
  }

  async gameDetail(userId: string, appId: number) {
    if (!Number.isFinite(appId) || appId <= 0) {
      throw new BadRequestException("Invalid appId");
    }

    const group = await this.getOrCreate(userId);
    const viewer = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const memberLibraries = await this.loadMemberLibraries(group);

    const familyOwners: {
      steamId: string;
      personaName: string;
      avatarUrl: string | null;
      playtimeForever: number;
      isMe: boolean;
      role: string;
    }[] = [];

    let name = `App ${appId}`;
    let headerImage: string | null = this.steam.headerImageFromAppId(appId);

    for (const m of memberLibraries) {
      const owned = m.games.get(appId);
      if (!owned) continue;
      familyOwners.push({
        steamId: m.steamId,
        personaName: m.personaName,
        avatarUrl: m.avatarUrl,
        playtimeForever: owned.playtimeForever,
        isMe: m.steamId === viewer.steamId,
        role: m.role,
      });
      name = owned.name || name;
      headerImage = owned.headerImage || headerImage;
    }

    if (!familyOwners.length) {
      throw new NotFoundException("Game is not in your family library");
    }

    const game = await this.prisma.game.findFirst({ where: { appId } });
    const categories = game ? parseStringArray(game.categories) : [];
    const genres = game ? parseStringArray(game.genres) : [];
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
    const familySteamIds = new Set(memberLibraries.map((m) => m.steamId));

    const friendOwners = friendships
      .filter(
        (f) =>
          friendCacheMap.has(f.friendSteamId) &&
          !familySteamIds.has(f.friendSteamId),
      )
      .map((f) => {
        const cache = friendCacheMap.get(f.friendSteamId)!;
        return {
          steamId: f.friendSteamId,
          personaName: f.personaName,
          avatarUrl: f.avatarUrl,
          playtimeForever: cache.playtimeForever,
        };
      })
      .sort((a, b) => b.playtimeForever - a.playtimeForever);

    const country = normalizePriceCountry(viewer.countryCode) || "US";
    const [prices, history, reviews, hltb, onlinePlayers] = await Promise.all([
      this.itad.getSteamPrices([appId], country),
      this.itad.getSteamPriceHistory(appId, country),
      this.steam.getAppReviews(appId),
      this.hltb.lookup(name),
      this.concurrentPlayers.getForApp(appId),
    ]);

    const itadPrice = prices[appId] || { current: null, lowest: null };
    const currentPrice = itadPrice.current ?? game?.currentPrice ?? null;
    const lowestPrice =
      itadPrice.lowest ??
      history.historicalLow ??
      game?.lowestPrice ??
      null;
    const historicalHigh = history.historicalHigh;
    const historicalLow = history.historicalLow ?? lowestPrice;

    // Persist review score when Steam returns one.
    if (reviews?.score != null && game) {
      await this.prisma.game.update({
        where: { id: game.id },
        data: { reviewScore: reviews.score },
      });
    }

    const familyPlaytimeForever = familyOwners.reduce(
      (s, o) => s + o.playtimeForever,
      0,
    );

    const meOwner = familyOwners.find((o) => o.isMe);

    return {
      appId,
      name,
      headerImage,
      genres,
      categories,
      tags: game ? parseStringArray(game.tags) : [],
      developers: game ? parseStringArray(game.developers) : [],
      publishers: game ? parseStringArray(game.publishers) : [],
      deckStatus: game?.deckStatus ?? null,
      releaseDate: game?.releaseDate?.toISOString() ?? null,
      isFree: game?.isFree ?? false,
      minPlayers: game?.minPlayers ?? null,
      maxPlayers: game?.maxPlayers ?? null,
      playerMaxes: (() => {
        const maxes = parsePlayerMaxes(game?.playerMaxes);
        if (maxes.length) return maxes;
        return game?.maxPlayers != null ? [game.maxPlayers] : null;
      })(),
      playerCountSource: (game?.playerCountSource as
        | "igdb"
        | "steam_tag"
        | null) ?? null,
      onlinePlayers,
      youOwn: Boolean(meOwner),
      yourPlaytimeHours: meOwner
        ? Math.round((meOwner.playtimeForever / 60) * 10) / 10
        : null,
      isFamilyShareable: this.isShareableGame(
        game ? { isFree: game.isFree, categories } : null,
      ),
      familyOwners: familyOwners
        .sort((a, b) => b.playtimeForever - a.playtimeForever)
        .map((o) => ({
          ...o,
          playtimeHours: Math.round((o.playtimeForever / 60) * 10) / 10,
        })),
      friendOwners: friendOwners.map((o) => ({
        ...o,
        playtimeHours: Math.round((o.playtimeForever / 60) * 10) / 10,
      })),
      playtime: {
        familyTotalHours: Math.round((familyPlaytimeForever / 60) * 10) / 10,
        ownersWithPlaytime: familyOwners.filter((o) => o.playtimeForever > 0)
          .length,
      },
      price: {
        current: currentPrice,
        lowest: lowestPrice,
        historicalLow,
        historicalHigh,
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
          }
        : game?.reviewScore != null
          ? {
              score: game.reviewScore,
              description: null,
              totalPositive: 0,
              totalNegative: 0,
              totalReviews: 0,
              storedScore: game.reviewScore,
            }
          : null,
      hltb,
    };
  }

  async getGroup(userId: string) {
    const group = await this.getOrCreate(userId);
    if (!group) throw new NotFoundException();
    return group;
  }
}
