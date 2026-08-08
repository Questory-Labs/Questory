import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import { parseStringArray } from "../lib/json-arrays";
import {
  FRIENDS_PAGE_SIZE,
  GAMES_PER_FRIEND_LIMIT,
  LIBRARY_CACHE_LIMIT,
} from "./friends.constants";

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async list(
    userId: string,
    opts: { page?: number; pageSize?: number } = {},
  ) {
    const take = Math.min(Math.max(opts.pageSize ?? FRIENDS_PAGE_SIZE, 1), 100);
    const safePage = Math.max(opts.page ?? 1, 1);
    const skip = (safePage - 1) * take;

    const [total, friends, allSteamIds, librarySync] = await Promise.all([
      this.prisma.friendship.count({ where: { userId } }),
      this.prisma.friendship.findMany({
        where: { userId },
        orderBy: { personaName: "asc" },
        skip,
        take,
      }),
      this.prisma.friendship.findMany({
        where: { userId },
        select: { friendSteamId: true },
      }),
      this.prisma.syncJob.findFirst({
        where: { userId, type: "library-sync", status: "completed" },
        orderBy: { finishedAt: "desc" },
      }),
    ]);

    const steamIds = allSteamIds.map((f) => f.friendSteamId);
    const cachedOwners = steamIds.length
      ? await this.prisma.friendLibraryCache.groupBy({
          by: ["ownerSteamId"],
          where: { ownerSteamId: { in: steamIds } },
          _count: { _all: true },
          _max: { syncedAt: true },
        })
      : [];
    const cachedSet = new Set(cachedOwners.map((c) => c.ownerSteamId));
    const lastSyncedAt =
      cachedOwners
        .map((c) => c._max.syncedAt)
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

    return {
      friends: friends.map((f) => ({
        steamId: f.friendSteamId,
        personaName: f.personaName,
        avatarUrl: f.avatarUrl,
        friendUserId: f.friendUserId,
        libraryCached: cachedSet.has(f.friendSteamId),
      })),
      total,
      page: safePage,
      pageSize: take,
      meta: {
        totalFriends: total,
        librariesCached: cachedSet.size,
        libraryCacheLimit: LIBRARY_CACHE_LIMIT,
        gamesPerFriendLimit: GAMES_PER_FRIEND_LIMIT,
        truncated:
          total > LIBRARY_CACHE_LIMIT ||
          cachedOwners.some((c) => c._count._all >= GAMES_PER_FRIEND_LIMIT),
        lastSyncedAt:
          lastSyncedAt?.toISOString() ??
          librarySync?.finishedAt?.toISOString() ??
          null,
      },
    };
  }

  async compare(userId: string, friendSteamId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { userId_friendSteamId: { userId, friendSteamId } },
    });
    if (!friendship) throw new NotFoundException("Friend not found");

    const yourLibrary = await this.prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: true },
    });
    const friendCache = await this.prisma.friendLibraryCache.findMany({
      where: { ownerSteamId: friendSteamId },
    });

    const yourApps = new Map(
      yourLibrary
        .filter((e) => e.game.appId != null)
        .map((e) => [e.game.appId as number, e]),
    );
    const friendApps = new Map(friendCache.map((e) => [e.gameAppId, e]));

    const common: number[] = [];
    const uniqueToYou: number[] = [];
    const uniqueToFriend: number[] = [];

    for (const appId of yourApps.keys()) {
      if (friendApps.has(appId)) common.push(appId);
      else uniqueToYou.push(appId);
    }
    for (const appId of friendApps.keys()) {
      if (!yourApps.has(appId)) uniqueToFriend.push(appId);
    }

    const genreCount = (entries: { game: { genres: string } }[]) => {
      const map = new Map<string, number>();
      for (const e of entries) {
        for (const g of parseStringArray(e.game.genres)) {
          map.set(g, (map.get(g) || 0) + 1);
        }
      }
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g]) => g);
    };

    const yourPlaytimeHours =
      yourLibrary.reduce((s, e) => s + e.playtimeForever, 0) / 60;
    const friendPlaytimeHours =
      friendCache.reduce((s, e) => s + e.playtimeForever, 0) / 60;

    const yourWishlist = await this.prisma.wishlistItem.findMany({
      where: { userId },
    });
    const friendUser = await this.accounts.findUserBySteamId(friendSteamId);
    let mutualWishlist = 0;
    if (friendUser) {
      const friendWishlist = await this.prisma.wishlistItem.findMany({
        where: { userId: friendUser.id },
      });
      const set = new Set(friendWishlist.map((w) => w.appId));
      mutualWishlist = yourWishlist.filter((w) => set.has(w.appId)).length;
    }

    const challengeGames = common
      .map((appId) => {
        const yours = yourApps.get(appId)!;
        const theirs = friendApps.get(appId)!;
        if (yours.playtimeForever < 60 && theirs.playtimeForever < 60) {
          return {
            appId,
            name: yours.game.name,
            headerImage: yours.game.headerImage,
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .slice(0, 12);

    const libraryValueYou = yourLibrary.reduce((s, e) => {
      if (e.game.isFree) return s;
      return s + (e.game.currentPrice ?? 0);
    }, 0);
    const libraryValueFriend = 0;

    const commonGameList = common.slice(0, 24).map((appId) => {
      const yours = yourApps.get(appId)!;
      return {
        appId,
        name: yours.game.name,
        headerImage: yours.game.headerImage,
      };
    });

    const friendAppIds = friendCache.map((c) => c.gameAppId);
    const friendGames = friendAppIds.length
      ? await this.prisma.game.findMany({
          where: { appId: { in: friendAppIds } },
          select: { genres: true },
        })
      : [];
    const favoriteGenresFriend = genreCount(
      friendGames.map((g) => ({ game: g })),
    );

    return {
      friend: {
        steamId: friendship.friendSteamId,
        personaName: friendship.personaName,
        avatarUrl: friendship.avatarUrl,
        friendUserId: friendship.friendUserId,
      },
      commonGames: common.length,
      uniqueToYou: uniqueToYou.length,
      uniqueToFriend: uniqueToFriend.length,
      yourPlaytimeHours: Math.round(yourPlaytimeHours * 10) / 10,
      friendPlaytimeHours: Math.round(friendPlaytimeHours * 10) / 10,
      favoriteGenresYou: genreCount(yourLibrary),
      favoriteGenresFriend,
      mutualWishlist,
      libraryValueYou: Math.round(libraryValueYou * 100) / 100,
      libraryValueFriend,
      challengeGames,
      commonGameList,
      meta: {
        friendLibraryCached: friendCache.length > 0,
        friendLibraryTruncated: friendCache.length >= GAMES_PER_FRIEND_LIMIT,
        gamesPerFriendLimit: GAMES_PER_FRIEND_LIMIT,
      },
    };
  }
}
