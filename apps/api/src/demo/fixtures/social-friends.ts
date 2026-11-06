import type { Friend, FriendCompare, FriendsListResponse } from "@questorylabs/shared";
import {
  COMMON_GAME_LIST_LIMIT,
  FRIENDS_PAGE_SIZE,
  FRIENDS_QUERY_MAX_LENGTH,
  GAMES_PER_FRIEND_LIMIT,
  LIBRARY_CACHE_LIMIT,
} from "../../friends/friends.constants";
import type { DemoRequestContext } from "../demo.types";
import { DEMO_FRIENDS, daysAgo } from "./helpers";
import {
  FRIEND_LIBRARIES,
  FRIEND_USER_IDS,
  FRIEND_WISHLISTS,
  MOSS,
  NOVA,
  QUILL,
  VIEWER_WISHLIST,
  findGame,
  gameRef,
  hours,
  libraryValue,
  pageOf,
  queryPage,
  queryPageSize,
  queryText,
  requireGame,
  viewerLibrary,
  viewerMinutes,
  viewerOwns,
  type SocialGame,
} from "./social-data";

const PRESENCE_SYNC_DAYS = 0.01;
const LIBRARY_SYNC_DAYS = 0.1;
const CHALLENGE_MINUTES = 60;

function friendRows(): Friend[] {
  const presenceSyncedAt = daysAgo(PRESENCE_SYNC_DAYS);
  const stardew = requireGame(413150);
  const rows: Friend[] = [
    {
      steamId: MOSS.steamId,
      personaName: MOSS.personaName,
      avatarUrl: null,
      friendUserId: FRIEND_USER_IDS.get(MOSS.steamId) ?? null,
      libraryCached: true,
      personaState: 0,
      currentAppId: null,
      currentGameName: null,
      lastLogoffAt: daysAgo(1.5),
      presenceSyncedAt,
    },
    {
      steamId: NOVA.steamId,
      personaName: NOVA.personaName,
      avatarUrl: null,
      friendUserId: FRIEND_USER_IDS.get(NOVA.steamId) ?? null,
      libraryCached: true,
      personaState: 1,
      currentAppId: stardew.appId,
      currentGameName: stardew.name,
      lastLogoffAt: daysAgo(0.6),
      presenceSyncedAt,
    },
    {
      steamId: QUILL.steamId,
      personaName: QUILL.personaName,
      avatarUrl: null,
      friendUserId: FRIEND_USER_IDS.get(QUILL.steamId) ?? null,
      libraryCached: true,
      personaState: 3,
      currentAppId: null,
      currentGameName: null,
      lastLogoffAt: daysAgo(0.4),
      presenceSyncedAt,
    },
  ];
  return rows;
}

export function friendsList(ctx: DemoRequestContext): FriendsListResponse {
  const q = queryText(ctx.query.q, FRIENDS_QUERY_MAX_LENGTH);
  const page = queryPage(ctx.query.page);
  const pageSize = queryPageSize(ctx.query.pageSize, FRIENDS_PAGE_SIZE);
  const rows = friendRows();
  const matches = rows.filter((row) =>
    q ? row.personaName.toLowerCase().includes(q) : true,
  );
  return {
    friends: pageOf(matches, page, pageSize),
    total: matches.length,
    page,
    pageSize,
    meta: {
      totalFriends: rows.length,
      librariesCached: rows.length,
      libraryCacheLimit: LIBRARY_CACHE_LIMIT,
      gamesPerFriendLimit: GAMES_PER_FRIEND_LIMIT,
      truncated: false,
      lastSyncedAt: daysAgo(LIBRARY_SYNC_DAYS),
      onlineCount: rows.filter((row) => (row.personaState ?? 0) > 0).length,
      presenceSyncedAt: daysAgo(PRESENCE_SYNC_DAYS),
    },
  } satisfies FriendsListResponse;
}

function topGenres(games: readonly SocialGame[]): string[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    for (const genre of game.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
}

export function friendCompare(ctx: DemoRequestContext): FriendCompare {
  const friend =
    DEMO_FRIENDS.find((row) => row.steamId === ctx.params.steamId) ??
    DEMO_FRIENDS[0];
  const friendLibrary = FRIEND_LIBRARIES.get(friend.steamId) ?? new Map<number, number>();
  const yours = viewerLibrary();
  const common = yours.filter((game) => friendLibrary.has(game.appId));
  const friendGames = [...friendLibrary.keys()]
    .map((appId) => findGame(appId))
    .filter((game): game is SocialGame => game != null);
  const friendWishlist = new Set(FRIEND_WISHLISTS.get(friend.steamId) ?? []);
  const friendPlaytime = [...friendLibrary.values()].reduce(
    (sum, minutes) => sum + minutes,
    0,
  );
  const yourPlaytime = yours.reduce((sum, game) => sum + game.minutes, 0);

  return {
    friend: {
      steamId: friend.steamId,
      personaName: friend.personaName,
      avatarUrl: null,
      friendUserId: FRIEND_USER_IDS.get(friend.steamId) ?? null,
    },
    commonGames: common.length,
    uniqueToYou: yours.length - common.length,
    uniqueToFriend: friendGames.filter((game) => !viewerOwns(game.appId)).length,
    yourPlaytimeHours: hours(yourPlaytime),
    friendPlaytimeHours: hours(friendPlaytime),
    favoriteGenresYou: topGenres(yours),
    favoriteGenresFriend: topGenres(friendGames),
    mutualWishlist: VIEWER_WISHLIST.filter((appId) => friendWishlist.has(appId))
      .length,
    libraryValueYou:
      Math.round(libraryValue(yours.map((game) => game.appId)) * 100) / 100,
    libraryValueFriend: 0,
    challengeGames: common
      .filter(
        (game) =>
          game.minutes < CHALLENGE_MINUTES &&
          (friendLibrary.get(game.appId) ?? 0) < CHALLENGE_MINUTES,
      )
      .map(gameRef),
    commonGameList: common
      .map((game) => ({
        ...gameRef(game),
        yourPlaytimeMinutes: viewerMinutes(game.appId),
        friendPlaytimeMinutes: friendLibrary.get(game.appId) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.yourPlaytimeMinutes +
            b.friendPlaytimeMinutes -
            (a.yourPlaytimeMinutes + a.friendPlaytimeMinutes) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, COMMON_GAME_LIST_LIMIT),
    meta: {
      friendLibraryCached: true,
      friendLibraryTruncated: false,
      gamesPerFriendLimit: GAMES_PER_FRIEND_LIMIT,
    },
  } satisfies FriendCompare;
}
