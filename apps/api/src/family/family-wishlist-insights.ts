import {
  FAMILY_SHAREABLE_LIMIT,
  FAMILY_WISHLIST_GAPS_LIMIT,
} from "./family.constants";

type InsightMember = {
  steamId: string;
  personaName: string;
  userId: string | null;
  games: Map<number, { name: string; headerImage: string | null }>;
};

export type FamilyWishlistRow = {
  userId: string;
  appId: number | null;
  name: string | null;
  headerImage: string | null;
  currentPrice: number | null;
};

export type ShareableNowItem = {
  appId: number;
  name: string;
  headerImage: string | null;
  direction: "toYou" | "fromYou";
  ownerSteamId: string;
  ownerName: string;
  wantedBySteamId: string;
  wantedByName: string;
};

export type WishlistGapItem = {
  appId: number;
  name: string;
  headerImage: string | null;
  currentPrice: number | null;
  wantedBy: string[];
};

export function wishlistVisibleUserIds(
  members: Array<{ steamId: string; userId: string | null }>,
  viewerUserId: string,
  friendSteamIds: Iterable<string>,
): string[] {
  const friends = new Set(friendSteamIds);
  return members
    .filter(
      (m) =>
        m.userId != null &&
        m.userId !== viewerUserId &&
        friends.has(m.steamId),
    )
    .map((m) => m.userId as string);
}

export function buildFamilyWishlistInsights(input: {
  viewerUserId: string;
  members: InsightMember[];
  wishlists: FamilyWishlistRow[];
}): {
  shareableNow: ShareableNowItem[];
  wishlistGaps: WishlistGapItem[];
  linkedMemberCount: number;
} {
  const linked = input.members.filter((m) => m.userId != null);
  const memberByUserId = new Map(linked.map((m) => [m.userId as string, m]));
  const viewer = memberByUserId.get(input.viewerUserId) ?? null;

  const ownersOf = (appId: number) =>
    input.members.filter((m) => m.games.has(appId));

  const shareableNow: ShareableNowItem[] = [];
  const seenShare = new Set<string>();
  const wanted = new Map<
    number,
    { row: FamilyWishlistRow; wantedBy: Map<string, string> }
  >();

  for (const row of input.wishlists) {
    if (row.appId == null) continue;
    const wanter = memberByUserId.get(row.userId);
    if (!wanter) continue;
    const owners = ownersOf(row.appId);

    if (owners.length === 0) {
      const entry = wanted.get(row.appId) ?? {
        row,
        wantedBy: new Map<string, string>(),
      };
      entry.wantedBy.set(wanter.steamId, wanter.personaName);
      wanted.set(row.appId, entry);
      continue;
    }
    if (owners.some((o) => o.steamId === wanter.steamId)) continue;

    let direction: ShareableNowItem["direction"] | null = null;
    let owner: InsightMember | undefined;
    if (viewer && wanter.steamId === viewer.steamId) {
      direction = "toYou";
      owner = owners[0];
    } else if (viewer && viewer.games.has(row.appId)) {
      direction = "fromYou";
      owner = viewer;
    }
    if (!direction || !owner) continue;
    const key = `${direction}:${row.appId}:${wanter.steamId}`;
    if (seenShare.has(key)) continue;
    seenShare.add(key);
    const game = owner.games.get(row.appId);
    shareableNow.push({
      appId: row.appId,
      name: game?.name || row.name || `App ${row.appId}`,
      headerImage: game?.headerImage ?? row.headerImage,
      direction,
      ownerSteamId: owner.steamId,
      ownerName: owner.personaName,
      wantedBySteamId: wanter.steamId,
      wantedByName: wanter.personaName,
    });
  }

  const wishlistGaps = [...wanted.entries()]
    .filter(([, v]) => v.wantedBy.size >= 2)
    .map(([appId, v]) => ({
      appId,
      name: v.row.name || `App ${appId}`,
      headerImage: v.row.headerImage,
      currentPrice: v.row.currentPrice,
      wantedBy: [...v.wantedBy.values()],
    }))
    .sort(
      (a, b) =>
        b.wantedBy.length - a.wantedBy.length || a.name.localeCompare(b.name),
    )
    .slice(0, FAMILY_WISHLIST_GAPS_LIMIT);

  return {
    shareableNow: shareableNow
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, FAMILY_SHAREABLE_LIMIT),
    wishlistGaps,
    linkedMemberCount: linked.length,
  };
}
