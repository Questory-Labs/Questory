import { PrismaService } from "../prisma/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import { gameRefFrom, iso, isoRequired, type GameRef } from "./profile-data.utils";

const GAME_INCLUDE = {
  storeListings: { select: { store: true, externalId: true } },
} as const;

export async function collectServices(
  prisma: PrismaService,
  accounts: AccountsService,
  userId: string,
): Promise<string[]> {
  const [linked, connections, stores] = await Promise.all([
    accounts.listForUser(userId),
    prisma.sourceConnection.findMany({
      where: { userId },
      select: { provider: true },
    }),
    prisma.storeAccount.findMany({
      where: { userId },
      select: { store: true },
    }),
  ]);
  return [
    ...new Set([
      ...linked.map((a) => a.provider),
      ...connections.map((c) => c.provider),
      ...stores.map((s) => s.store),
    ]),
  ].sort();
}

export async function collectProfile(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { countryCode: true, priceRegionLocked: true },
  });
  return {
    countryCode: user.countryCode,
    priceRegionLocked: user.priceRegionLocked,
  };
}

export async function collectLibrary(prisma: PrismaService, userId: string) {
  const rows = await prisma.libraryEntry.findMany({
    where: { userId },
    include: { game: { include: GAME_INCLUDE } },
  });
  const out: Array<GameRef & Record<string, unknown>> = [];
  for (const row of rows) {
    const ref = gameRefFrom(row.game);
    if (!ref) continue;
    out.push({
      ...ref,
      playtimeForever: row.playtimeForever,
      playtime2Weeks: row.playtime2Weeks,
      lastPlayedAt: iso(row.lastPlayedAt),
      pricePaid: row.pricePaid,
      purchasedAt: iso(row.purchasedAt),
      hidden: row.hidden,
      isFamilyShared: row.isFamilyShared,
    });
  }
  return out;
}

export async function collectWishlistTargets(
  prisma: PrismaService,
  userId: string,
) {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId, targetPrice: { not: null } },
    include: { game: { include: GAME_INCLUDE } },
  });
  return rows.flatMap((row) => {
    const ref =
      gameRefFrom(row.game) ??
      (row.externalId
        ? {
            store: (row.store === "epic" || row.store === "gog"
              ? row.store
              : "steam") as GameRef["store"],
            externalId: row.externalId,
            appId: row.appId,
            name: row.name ?? undefined,
          }
        : null);
    if (!ref || row.targetPrice == null) return [];
    return [
      {
        ...ref,
        targetPrice: row.targetPrice,
        priority: row.priority,
        dateAdded: iso(row.dateAdded),
      },
    ];
  });
}

export async function collectPurchases(prisma: PrismaService, userId: string) {
  const rows = await prisma.purchase.findMany({ where: { userId } });
  return rows.map((row) => ({
    store: row.store,
    externalId: row.externalId,
    appId: row.appId,
    amount: row.amount,
    currency: row.currency,
    purchasedAt: isoRequired(row.purchasedAt),
    source: row.source,
    discountPct: row.discountPct,
  }));
}

export async function collectCollections(prisma: PrismaService, userId: string) {
  const rows = await prisma.collection.findMany({
    where: { userId, type: "custom" },
    include: {
      items: { include: { game: { include: GAME_INCLUDE } } },
    },
  });
  return rows.map((row) => ({
    name: row.name,
    description: row.description,
    items: row.items.flatMap((item) => {
      const ref = gameRefFrom(item.game);
      return ref ? [ref] : [];
    }),
  }));
}

export async function collectPlaySessions(
  prisma: PrismaService,
  userId: string,
) {
  const rows = await prisma.playSession.findMany({ where: { userId } });
  return rows.map((row) => ({
    externalId: row.externalId,
    title: row.title,
    source: row.source,
    appId: row.appId,
    startedAt: isoRequired(row.startedAt),
    endedAt: isoRequired(row.endedAt),
    durationSecs: row.durationSecs,
    exe: row.exe,
    hostOs: row.hostOs,
    hostName: row.hostName,
  }));
}

export async function collectPlaySessionRules(
  prisma: PrismaService,
  userId: string,
) {
  const rows = await prisma.userPlaySessionRule.findMany({
    where: { userId },
    include: { targetGame: { include: GAME_INCLUDE } },
  });
  return rows.flatMap((row) => {
    const target = gameRefFrom(row.targetGame);
    if (!target) return [];
    return [
      {
        matchKey: row.matchKey,
        matchExeNorm: row.matchExeNorm,
        matchTitleNorm: row.matchTitleNorm,
        target,
      },
    ];
  });
}

export async function collectFamily(prisma: PrismaService, userId: string) {
  const group = await prisma.familyGroup.findFirst({
    where: { ownerId: userId },
    include: { members: true },
  });
  if (!group) return null;
  return {
    name: group.name,
    members: group.members.map((m) => ({
      steamId: m.steamId,
      role: m.role,
      personaName: m.personaName,
      avatarUrl: m.avatarUrl,
    })),
  };
}

export async function collectMusicRules(prisma: PrismaService, userId: string) {
  const rows = await prisma.userMusicRule.findMany({
    where: { userId },
    include: {
      targetArtists: { include: { artist: true }, orderBy: { position: "asc" } },
    },
  });
  return rows.map((row) => ({
    kind: row.kind as "track" | "album" | "artist",
    matchArtistNorm: row.matchArtistNorm,
    matchAlbumNorm: row.matchAlbumNorm,
    matchTrackNorm: row.matchTrackNorm,
    targetTrackTitle: row.targetTrackTitle,
    targetAlbumTitle: row.targetAlbumTitle,
    artistCredit: row.artistCredit,
    targetArtists: row.targetArtists.map((a) => ({
      name: a.artist.name,
      mbid: a.artist.mbid,
    })),
  }));
}

export async function collectMusicLabels(prisma: PrismaService, userId: string) {
  const rows = await prisma.userMusicLabel.findMany({ where: { userId } });
  const out: Array<{
    entityKind: "artist" | "release" | "track";
    displayName: string;
    artistName?: string | null;
    title?: string | null;
    mbid?: string | null;
  }> = [];
  for (const row of rows) {
    if (row.entityKind === "artist") {
      const artist = await prisma.artist.findUnique({
        where: { id: row.entityId },
      });
      if (!artist) continue;
      out.push({
        entityKind: "artist",
        displayName: row.displayName,
        artistName: artist.name,
        mbid: artist.mbid,
      });
      continue;
    }
    if (row.entityKind === "release") {
      const release = await prisma.release.findUnique({
        where: { id: row.entityId },
        include: { artist: true },
      });
      if (!release) continue;
      out.push({
        entityKind: "release",
        displayName: row.displayName,
        artistName: release.artist?.name ?? null,
        title: release.title,
        mbid: release.mbid ?? release.releaseMbid,
      });
      continue;
    }
    const track = await prisma.track.findUnique({
      where: { id: row.entityId },
      include: { artist: true },
    });
    if (!track) continue;
    out.push({
      entityKind: "track",
      displayName: row.displayName,
      artistName: track.artist.name,
      title: track.title,
      mbid: track.recordingMbid ?? track.trackMbid,
    });
  }
  return out;
}

export async function collectWatchListStates(
  prisma: PrismaService,
  userId: string,
) {
  const rows = await prisma.titleListState.findMany({
    where: { userId },
    include: { title: true },
  });
  return rows.map((row) => ({
    listType: row.listType,
    source: row.source,
    rating: row.rating,
    listedAt: iso(row.listedAt),
    title: watchTitleRef(row.title),
  }));
}

export async function collectReadListStates(
  prisma: PrismaService,
  userId: string,
) {
  const rows = await prisma.readListState.findMany({
    where: { userId },
    include: { readTitle: true },
  });
  return rows.map((row) => ({
    listStatus: row.listStatus,
    source: row.source,
    score: row.score,
    progressChapters: row.progressChapters,
    progressVolumes: row.progressVolumes,
    listedAt: iso(row.listedAt),
    title: readTitleRef(row.readTitle),
  }));
}

function watchTitleRef(title: {
  type: string;
  name: string;
  year: number | null;
  traktId: number | null;
  tmdbId: number | null;
  imdbId: string | null;
  anilistId: number | null;
  malId: number | null;
  kitsuId: number | null;
  bangumiId: number | null;
  shikimoriId: number | null;
}) {
  return {
    type: title.type === "show" ? ("show" as const) : ("movie" as const),
    name: title.name,
    year: title.year,
    traktId: title.traktId,
    tmdbId: title.tmdbId,
    imdbId: title.imdbId,
    anilistId: title.anilistId,
    malId: title.malId,
    kitsuId: title.kitsuId,
    bangumiId: title.bangumiId,
    shikimoriId: title.shikimoriId,
  };
}

function readTitleRef(title: {
  format: string;
  name: string;
  year: number | null;
  anilistId: number | null;
  malId: number | null;
  kitsuId: number | null;
  bangumiId: number | null;
  shikimoriId: number | null;
}) {
  return {
    format: title.format,
    name: title.name,
    year: title.year,
    anilistId: title.anilistId,
    malId: title.malId,
    kitsuId: title.kitsuId,
    bangumiId: title.bangumiId,
    shikimoriId: title.shikimoriId,
  };
}

export { watchTitleRef, readTitleRef };
