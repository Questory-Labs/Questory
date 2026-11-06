import type {
  FamilyGameDetail,
  FamilyInsights,
  FamilyLibrary,
  FamilyMemberSummary,
} from "@questorylabs/shared";
import { FAMILY_LIBRARY_PAGE_SIZE } from "../../family/family.constants";
import { buildFamilyWishlistInsights } from "../../family/family-wishlist-insights";
import type { DemoRequestContext } from "../demo.types";
import { daysAgo, steamHeaderUrl } from "./helpers";
import {
  FRIEND_LIBRARIES,
  FRIEND_USER_IDS,
  FRIEND_WISHLISTS,
  MOSS,
  NOVA,
  QUILL,
  SOCIAL_GAMES,
  VIEWER_CURRENCY,
  VIEWER_NAME,
  VIEWER_STEAM_ID,
  VIEWER_USER_ID,
  VIEWER_WISHLIST,
  findGame,
  gameRef,
  hours,
  pageOf,
  queryPage,
  queryPageSize,
  queryText,
  requireGame,
  viewerLibrary,
  viewerOwns,
  type SocialGame,
} from "./social-data";

const FAMILY_GROUP_ID = "demo-family";
const QUERY_MAX_LENGTH = 64;

type Member = {
  steamId: string;
  personaName: string;
  avatarUrl: null;
  role: string;
  userId: string | null;
  library: ReadonlyMap<number, number>;
};

function viewerMembership(): ReadonlyMap<number, number> {
  return new Map(viewerLibrary().map((game) => [game.appId, game.minutes]));
}

function members(): Member[] {
  return [
    {
      steamId: VIEWER_STEAM_ID,
      personaName: VIEWER_NAME,
      avatarUrl: null,
      role: "owner",
      userId: VIEWER_USER_ID,
      library: viewerMembership(),
    },
    ...[NOVA, QUILL].map((friend) => ({
      steamId: friend.steamId,
      personaName: friend.personaName,
      avatarUrl: null,
      role: "member",
      userId: FRIEND_USER_IDS.get(friend.steamId) ?? null,
      library: FRIEND_LIBRARIES.get(friend.steamId) ?? new Map<number, number>(),
    })),
  ];
}

function ownersOf(all: readonly Member[], appId: number): Member[] {
  return all.filter((member) => member.library.has(appId));
}

function uniqueFamilyGames(all: readonly Member[]): SocialGame[] {
  return SOCIAL_GAMES.filter((game) => ownersOf(all, game.appId).length > 0);
}

function wishlistRows(all: readonly Member[]) {
  const rowsFor = (userId: string, appIds: readonly number[]) =>
    appIds.map((appId) => {
      const game = requireGame(appId);
      return {
        userId,
        appId,
        name: game.name,
        headerImage: steamHeaderUrl(appId),
        currentPrice: game.currentPrice,
      };
    });
  const rows = rowsFor(VIEWER_USER_ID, VIEWER_WISHLIST);
  for (const member of all) {
    if (!member.userId || member.userId === VIEWER_USER_ID) continue;
    rows.push(...rowsFor(member.userId, FRIEND_WISHLISTS.get(member.steamId) ?? []));
  }
  return rows;
}

function memberSummary(member: Member, all: readonly Member[]): FamilyMemberSummary {
  let playtimeMinutes = 0;
  let unusedCount = 0;
  let sharedCount = 0;
  let uniqueCount = 0;
  let trackedSpend = 0;
  for (const [appId, minutes] of member.library) {
    playtimeMinutes += minutes;
    if (minutes === 0) unusedCount += 1;
    if (ownersOf(all, appId).length > 1) sharedCount += 1;
    else uniqueCount += 1;
    trackedSpend += findGame(appId)?.currentPrice ?? 0;
  }
  return {
    steamId: member.steamId,
    personaName: member.personaName,
    avatarUrl: member.avatarUrl,
    role: member.role,
    isMe: member.steamId === VIEWER_STEAM_ID,
    librarySize: member.library.size,
    sharedCount,
    uniqueCount,
    trackedSpend: Math.round(trackedSpend),
    wishlistGaps: VIEWER_WISHLIST.filter((appId) => !member.library.has(appId))
      .length,
    playtimeHours: hours(playtimeMinutes),
    unusedCount,
  };
}

export function familyGroup() {
  return {
    id: FAMILY_GROUP_ID,
    ownerId: VIEWER_USER_ID,
    name: "My Family",
    createdAt: daysAgo(210),
    members: members().map((member) => ({
      id: `demo-family-member-${member.steamId}`,
      groupId: FAMILY_GROUP_ID,
      userId: member.userId,
      steamId: member.steamId,
      personaName: member.personaName,
      avatarUrl: member.avatarUrl,
      role: member.role,
    })),
  };
}

export function familyInsights(): FamilyInsights {
  const all = members();
  const unique = uniqueFamilyGames(all);
  const overlap = unique.filter((game) => ownersOf(all, game.appId).length > 1);
  const summaries = all.map((member) => memberSummary(member, all));
  const missingWanted = (member: Member) =>
    VIEWER_WISHLIST.filter((appId) => !member.library.has(appId)).length;
  const others = all.filter((member) => member.steamId !== VIEWER_STEAM_ID);
  const purchaser = others.reduce(
    (best, member) =>
      missingWanted(member) > missingWanted(best) ? member : best,
    others[0],
  );
  const wishlistInsights = buildFamilyWishlistInsights({
    viewerUserId: VIEWER_USER_ID,
    members: all.map((member) => ({
      steamId: member.steamId,
      personaName: member.personaName,
      userId: member.userId,
      games: new Map(
        [...member.library.keys()].map((appId) => {
          const game = requireGame(appId);
          return [
            appId,
            { name: game.name, headerImage: steamHeaderUrl(appId) },
          ] as const;
        }),
      ),
    })),
    wishlists: wishlistRows(all),
  });
  return {
    memberCount: all.length,
    totalUniqueGames: unique.length,
    overlapCount: overlap.length,
    duplicatePurchases: overlap.length,
    familyValue: Math.round(
      unique.reduce((sum, game) => sum + game.currentPrice, 0),
    ),
    currency: VIEWER_CURRENCY,
    suggestedPurchaser: {
      steamId: purchaser.steamId,
      personaName: purchaser.personaName,
      reason: `Missing ${missingWanted(purchaser)} of your wishlist games — best next buyer`,
    },
    meSteamId: VIEWER_STEAM_ID,
    members: summaries,
    conflicts: [],
    ...wishlistInsights,
  } satisfies FamilyInsights;
}

export function familyLibrary(ctx: DemoRequestContext): FamilyLibrary {
  const all = members();
  const q = queryText(ctx.query.q, QUERY_MAX_LENGTH);
  const overlapOnly = ctx.query.overlapOnly === "true";
  const memberFilter =
    typeof ctx.query.memberSteamId === "string"
      ? all.find((member) => member.steamId === ctx.query.memberSteamId)
      : undefined;
  const page = queryPage(ctx.query.page);
  const pageSize = queryPageSize(ctx.query.pageSize, FAMILY_LIBRARY_PAGE_SIZE);

  const rows = uniqueFamilyGames(all)
    .filter((game) => (memberFilter ? memberFilter.library.has(game.appId) : true))
    .filter((game) => (q ? game.name.toLowerCase().includes(q) : true))
    .map((game) => {
      const owners = ownersOf(all, game.appId);
      const totalMinutes = owners.reduce(
        (sum, owner) => sum + (owner.library.get(game.appId) ?? 0),
        0,
      );
      return { game, owners, totalMinutes };
    })
    .filter((row) => (overlapOnly ? row.owners.length > 1 : true))
    .sort(
      (a, b) =>
        b.owners.length - a.owners.length ||
        b.totalMinutes - a.totalMinutes ||
        a.game.name.localeCompare(b.game.name),
    );

  return {
    total: rows.length,
    page,
    pageSize,
    meSteamId: VIEWER_STEAM_ID,
    members: all.map((member) => ({
      steamId: member.steamId,
      personaName: member.personaName,
      avatarUrl: member.avatarUrl,
      role: member.role,
      isMe: member.steamId === VIEWER_STEAM_ID,
      librarySize: member.library.size,
    })),
    items: pageOf(rows, page, pageSize).map(({ game, owners, totalMinutes }) => ({
      ...gameRef(game),
      ownerCount: owners.length,
      owners: owners.map((owner) => ({
        steamId: owner.steamId,
        personaName: owner.personaName,
        avatarUrl: owner.avatarUrl,
        isMe: owner.steamId === VIEWER_STEAM_ID,
      })),
      familyPlaytimeHours: hours(totalMinutes),
      currentPrice: game.currentPrice,
      lowestPrice: game.lowestPrice,
    })),
  } satisfies FamilyLibrary;
}

function priceHistory(game: SocialGame) {
  return [
    { date: daysAgo(330), price: game.highestPrice },
    { date: daysAgo(270), price: game.lowestPrice },
    { date: daysAgo(210), price: game.highestPrice },
    { date: daysAgo(120), price: game.lowestPrice },
    { date: daysAgo(60), price: game.highestPrice },
    { date: daysAgo(7), price: game.currentPrice },
  ];
}

function onlineHistory(game: SocialGame) {
  const shape = [0.72, 0.86, 0.94, 0.78, 0.88, 1, 0.91, 0.96];
  return shape.map((factor, index) => ({
    date: daysAgo(shape.length - 1 - index),
    players: Math.round(game.online.peak24h * factor),
  }));
}

function resolveGame(raw: string): SocialGame {
  return SOCIAL_GAMES.find((game) => String(game.appId) === raw) ?? SOCIAL_GAMES[0];
}

export function familyGameDetail(ctx: DemoRequestContext): FamilyGameDetail {
  const all = members();
  const game = resolveGame(ctx.params.appId ?? "");
  const owners = ownersOf(all, game.appId)
    .map((owner) => {
      const playtimeForever = owner.library.get(game.appId) ?? 0;
      return {
        steamId: owner.steamId,
        personaName: owner.personaName,
        avatarUrl: owner.avatarUrl,
        playtimeForever,
        playtimeHours: hours(playtimeForever),
        isMe: owner.steamId === VIEWER_STEAM_ID,
        role: owner.role,
      };
    })
    .sort((a, b) => b.playtimeForever - a.playtimeForever);
  const familyMinutes = owners.reduce((sum, o) => sum + o.playtimeForever, 0);
  const mossMinutes = FRIEND_LIBRARIES.get(MOSS.steamId)?.get(game.appId);
  const totalPositive = Math.round(game.totalReviews * game.positiveShare);
  return {
    ...gameRef(game),
    genres: [...game.genres],
    categories: game.categories,
    tags: game.tags,
    developers: game.developers,
    publishers: game.publishers,
    deckStatus: game.deckStatus,
    releaseDate: new Date(game.releaseDate).toISOString(),
    isFree: false,
    minPlayers: game.players?.min ?? null,
    maxPlayers: game.players?.max ?? null,
    playerMaxes: game.players?.maxes ?? null,
    playerCountSource: game.players?.source ?? null,
    onlinePlayers: {
      current: game.online.current,
      peak24h: game.online.peak24h,
      peakAllTime: game.online.peakAllTime,
      history: onlineHistory(game),
    },
    youOwn: viewerOwns(game.appId),
    yourPlaytimeHours: viewerOwns(game.appId) ? hours(game.minutes) : null,
    isFamilyShareable: game.categories.includes("Family Sharing"),
    familyOwners: owners,
    friendOwners:
      mossMinutes == null
        ? []
        : [
            {
              steamId: MOSS.steamId,
              personaName: MOSS.personaName,
              avatarUrl: null,
              playtimeForever: mossMinutes,
              playtimeHours: hours(mossMinutes),
            },
          ],
    playtime: {
      familyTotalHours: hours(familyMinutes),
      ownersWithPlaytime: owners.filter((o) => o.playtimeForever > 0).length,
    },
    price: {
      current: game.currentPrice,
      lowest: game.lowestPrice,
      historicalLow: game.lowestPrice,
      historicalHigh: game.highestPrice,
      currency: VIEWER_CURRENCY,
      history: priceHistory(game),
    },
    review: {
      score: game.reviewScore,
      description: game.reviewDescription,
      totalPositive,
      totalNegative: game.totalReviews - totalPositive,
      totalReviews: game.totalReviews,
      storedScore: game.reviewScore,
    },
    hltb: {
      mainHours: game.hltb.main,
      extraHours: game.hltb.extra,
      completionistHours: game.hltb.completionist,
      sourceUrl: null,
    },
  } satisfies FamilyGameDetail;
}
