import { describe, expect, it } from "vitest";
import {
  buildFamilyWishlistInsights,
  wishlistVisibleUserIds,
} from "../../src/family/family-wishlist-insights";

const games = (...ids: number[]) =>
  new Map(ids.map((id) => [id, { name: `G${id}`, headerImage: null }]));

describe("buildFamilyWishlistInsights", () => {
  const members = [
    { steamId: "me", personaName: "Me", userId: "u-me", games: games(1, 2) },
    { steamId: "b", personaName: "B", userId: "u-b", games: games(3) },
    { steamId: "c", personaName: "C", userId: "u-c", games: games() },
    { steamId: "d", personaName: "D", userId: null, games: games(4) },
  ];
  const row = (userId: string, appId: number) => ({
    userId,
    appId,
    name: `W${appId}`,
    headerImage: null,
    currentPrice: 9.99,
  });

  it("finds shareable games both ways and gaps wanted by 2+", () => {
    const res = buildFamilyWishlistInsights({
      viewerUserId: "u-me",
      members,
      wishlists: [
        row("u-me", 3),
        row("u-me", 4),
        row("u-b", 1),
        row("u-c", 2),
        row("u-c", 1),
        row("u-me", 9),
        row("u-b", 9),
        row("u-c", 8),
        row("u-x", 9),
      ],
    });

    expect(res.linkedMemberCount).toBe(3);
    expect(
      res.shareableNow.map((s) => [s.direction, s.appId, s.ownerSteamId, s.wantedBySteamId]),
    ).toEqual(
      expect.arrayContaining([
        ["toYou", 3, "b", "me"],
        ["toYou", 4, "d", "me"],
        ["fromYou", 1, "me", "b"],
        ["fromYou", 2, "me", "c"],
        ["fromYou", 1, "me", "c"],
      ]),
    );
    expect(res.shareableNow).toHaveLength(5);
    expect(res.wishlistGaps).toEqual([
      {
        appId: 9,
        name: "W9",
        headerImage: null,
        currentPrice: 9.99,
        wantedBy: ["Me", "B"],
      },
    ]);
  });

  it("ignores games the wanter already owns", () => {
    const res = buildFamilyWishlistInsights({
      viewerUserId: "u-me",
      members,
      wishlists: [row("u-me", 1), row("u-b", 3)],
    });
    expect(res.shareableNow).toEqual([]);
    expect(res.wishlistGaps).toEqual([]);
  });
});

describe("wishlistVisibleUserIds", () => {
  const members = [
    { steamId: "76561190000000001", userId: "me" },
    { steamId: "76561190000000002", userId: "friend" },
    { steamId: "76561190000000003", userId: "stranger" },
    { steamId: "76561190000000004", userId: null },
  ];

  it("only exposes linked members who are the viewer's Steam friends", () => {
    expect(
      wishlistVisibleUserIds(members, "me", ["76561190000000002", "76561190000000004"]),
    ).toEqual(["friend"]);
  });

  it("never includes the viewer", () => {
    expect(wishlistVisibleUserIds(members, "me", ["76561190000000001"])).toEqual([]);
  });
});
