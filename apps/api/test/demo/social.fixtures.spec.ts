import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FamilyGameDetailSchema,
  FamilyInsightsSchema,
  FamilyLibrarySchema,
  FriendCompareSchema,
  FriendsListResponseSchema,
  MultiplayerPlanResponseSchema,
  TrendingResponseSchema,
  TrendingShelfSchema,
} from "@questorylabs/shared";
import { findDemoRoute } from "../../src/demo/demo.routes";
import type { DemoRequestContext } from "../../src/demo/demo.types";
import {
  DEMO_FRIENDS,
  DEMO_GAMES,
  steamHeaderUrl,
} from "../../src/demo/fixtures/helpers";
import { socialRoutes } from "../../src/demo/fixtures/social";
import { SOCIAL_CATALOG } from "../../src/demo/fixtures/social-catalog";
import {
  FRIEND_LIBRARIES,
  FRIEND_RECENT_MINUTES,
  VIEWER_STEAM_ID,
} from "../../src/demo/fixtures/social-data";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const [NOVA, MOSS, QUILL] = DEMO_FRIENDS;
const CYBERPUNK = 1091500;
const IT_TAKES_TWO = 1426210;
const ALLOWED_STEAM_IDS = new Set<string>([
  VIEWER_STEAM_ID,
  ...DEMO_FRIENDS.map((friend) => friend.steamId),
]);
const ALLOWED_IMAGES = new Set(DEMO_GAMES.map((game) => steamHeaderUrl(game.appId)));

function call(
  method: "GET" | "POST",
  path: string,
  overrides: Partial<DemoRequestContext> = {},
): any {
  const match = findDemoRoute(method, path, socialRoutes);
  if (!match) throw new Error(`No route for ${method} ${path}`);
  return match.route.respond({
    exp: NOW.getTime() + 60_000,
    params: match.params,
    query: {},
    body: undefined,
    ...overrides,
  });
}

function assertNoUnsafeData(payload: unknown) {
  const text = JSON.stringify(payload);
  for (const id of text.match(/\d{17}/g) ?? []) {
    expect(ALLOWED_STEAM_IDS.has(id)).toBe(true);
  }
  for (const url of text.match(/https?:\/\/[^"]+/g) ?? []) {
    expect(ALLOWED_IMAGES.has(url)).toBe(true);
  }
}

describe("social demo fixtures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers exactly the expected routes", () => {
    expect(socialRoutes.map((r) => `${r.method} ${r.pattern}`).sort()).toEqual(
      [
        "GET /friends",
        "GET /friends/:steamId/compare",
        "GET /family",
        "GET /family/library",
        "GET /family/insights",
        "GET /family/games/:appId",
        "GET /trending",
        "GET /trending/friends",
        "GET /trending/global",
        "GET /trending/concurrent",
        "GET /trending/deck",
        "GET /trending/top-releases",
        "POST /multiplayer/plan",
      ].sort(),
    );
  });

  it("has catalog metadata for every demo game", () => {
    for (const game of DEMO_GAMES) {
      expect(SOCIAL_CATALOG[game.appId]).toBeDefined();
    }
  });

  it("only claims library and recent titles the catalog knows", () => {
    const known = new Set<number>(DEMO_GAMES.map((game) => game.appId));
    for (const library of FRIEND_LIBRARIES.values()) {
      for (const appId of library.keys()) expect(known.has(appId)).toBe(true);
    }
    for (const [steamId, recent] of FRIEND_RECENT_MINUTES) {
      for (const appId of recent.keys()) {
        expect(FRIEND_LIBRARIES.get(steamId)?.has(appId)).toBe(true);
      }
    }
  });

  describe("friends", () => {
    it("lists friends with presence and passes the schema", () => {
      const res = FriendsListResponseSchema.parse(call("GET", "/friends"));
      expect(res.total).toBe(3);
      expect(res.friends.map((f) => f.personaName)).toEqual([
        MOSS.personaName,
        NOVA.personaName,
        QUILL.personaName,
      ]);
      expect(res.meta.onlineCount).toBe(2);
      expect(res.friends.every((f) => f.avatarUrl === null)).toBe(true);
      assertNoUnsafeData(res);
    });

    it("applies q and paging, and tolerates junk query values", () => {
      const filtered = FriendsListResponseSchema.parse(
        call("GET", "/friends", { query: { q: "quill" } }),
      );
      expect(filtered.friends.map((f) => f.steamId)).toEqual([QUILL.steamId]);
      expect(filtered.total).toBe(1);

      const paged = FriendsListResponseSchema.parse(
        call("GET", "/friends", { query: { page: "2", pageSize: "2" } }),
      );
      expect(paged.friends).toHaveLength(1);
      expect(paged.total).toBe(3);

      const junk = FriendsListResponseSchema.parse(
        call("GET", "/friends", {
          query: { q: { a: 1 }, page: ["x"], pageSize: "-4" },
        }),
      );
      expect(junk.friends).toHaveLength(3);
      expect(junk.page).toBe(1);
    });

    it("compares each friend with non-empty lists", () => {
      for (const friend of DEMO_FRIENDS) {
        const res = FriendCompareSchema.parse(
          call("GET", `/friends/${friend.steamId}/compare`),
        );
        expect(res.friend.steamId).toBe(friend.steamId);
        expect(res.commonGames).toBeGreaterThan(0);
        expect(res.commonGameList.length).toBe(res.commonGames);
        expect(res.challengeGames.map((g) => g.appId)).toEqual([CYBERPUNK]);
        expect(res.favoriteGenresFriend.length).toBeGreaterThan(0);
        assertNoUnsafeData(res);
      }
    });

    it("falls back to a known friend without echoing an unknown id", () => {
      const res = FriendCompareSchema.parse(
        call("GET", "/friends/%3Cscript%3E/compare"),
      );
      expect(res.friend.steamId).toBe(NOVA.steamId);
      expect(JSON.stringify(res)).not.toContain("script");
    });
  });

  describe("family", () => {
    it("returns a group with invented members", () => {
      const res = call("GET", "/family");
      expect(res.members.map((m: { steamId: string }) => m.steamId)).toEqual([
        VIEWER_STEAM_ID,
        NOVA.steamId,
        QUILL.steamId,
      ]);
      expect(res.members[0].role).toBe("owner");
      expect(res.createdAt).toBe(new Date(NOW.getTime() - 210 * 86_400_000).toISOString());
      assertNoUnsafeData(res);
    });

    it("returns insights with stats and populated wishlist panels", () => {
      const res = FamilyInsightsSchema.parse(call("GET", "/family/insights"));
      expect(res.memberCount).toBe(3);
      expect(res.overlapCount).toBe(res.duplicatePurchases);
      expect(res.overlapCount).toBeGreaterThan(0);
      expect(res.familyValue).toBeGreaterThan(0);
      expect(res.shareableNow?.length).toBeGreaterThan(0);
      expect(res.wishlistGaps?.map((g) => g.appId)).toEqual([IT_TAKES_TWO]);
      expect(res.linkedMemberCount).toBe(3);
      expect(res.suggestedPurchaser?.steamId).toBe(NOVA.steamId);
      assertNoUnsafeData(res);
    });

    it("pages and filters the library", () => {
      const full = FamilyLibrarySchema.parse(call("GET", "/family/library"));
      expect(full.total).toBeGreaterThan(5);
      expect(full.meSteamId).toBe(VIEWER_STEAM_ID);
      assertNoUnsafeData(full);

      const page = FamilyLibrarySchema.parse(
        call("GET", "/family/library", { query: { page: "2", pageSize: "3" } }),
      );
      expect(page.items).toHaveLength(3);
      expect(page.total).toBe(full.total);

      const overlap = FamilyLibrarySchema.parse(
        call("GET", "/family/library", { query: { overlapOnly: "true" } }),
      );
      expect(overlap.items.length).toBeGreaterThan(0);
      expect(overlap.items.every((item) => item.ownerCount > 1)).toBe(true);

      const member = FamilyLibrarySchema.parse(
        call("GET", "/family/library", {
          query: { memberSteamId: QUILL.steamId },
        }),
      );
      expect(member.total).toBe(FRIEND_LIBRARIES.get(QUILL.steamId)?.size);

      const search = FamilyLibrarySchema.parse(
        call("GET", "/family/library", { query: { q: "portal" } }),
      );
      expect(search.items.map((item) => item.name)).toEqual(["Portal 2"]);

      expect(() =>
        FamilyLibrarySchema.parse(
          call("GET", "/family/library", {
            query: { q: ["x"], memberSteamId: { $ne: 1 }, page: "abc" },
          }),
        ),
      ).not.toThrow();
    });

    it("returns game detail for owned titles and a safe fallback otherwise", () => {
      const res = FamilyGameDetailSchema.parse(call("GET", "/family/games/620"));
      expect(res.name).toBe("Portal 2");
      expect(res.familyOwners.length).toBeGreaterThan(1);
      expect(res.friendOwners.map((o) => o.steamId)).toEqual([MOSS.steamId]);
      expect(res.price.history.length).toBeGreaterThan(0);
      expect(res.hltb?.sourceUrl).toBeNull();
      assertNoUnsafeData(res);

      for (const raw of ["999999", "abc", "-1", "__proto__"]) {
        const fallback = FamilyGameDetailSchema.parse(
          call("GET", `/family/games/${raw}`),
        );
        expect(fallback.name).toBe("Hades");
        expect(fallback.familyOwners.length).toBeGreaterThan(0);
      }
    });

    it("opens the title a wishlist gap card links to", () => {
      const res = FamilyGameDetailSchema.parse(
        call("GET", `/family/games/${IT_TAKES_TWO}`),
      );
      expect(res.name).toBe("It Takes Two");
      expect(res.youOwn).toBe(false);
      expect(res.familyOwners).toEqual([]);
      expect(res.friendOwners.map((o) => o.steamId)).toEqual([MOSS.steamId]);
    });
  });

  describe("trending", () => {
    it("returns the combined response", () => {
      const res = TrendingResponseSchema.parse(call("GET", "/trending"));
      expect(res.friends.games.length).toBeGreaterThan(0);
      expect(res.global.games.length).toBeGreaterThan(0);
      expect(res.concurrent?.games.length).toBeGreaterThan(0);
      expect(res.deck?.games.length).toBeGreaterThan(0);
      expect(res.topReleases?.games.length).toBeGreaterThan(0);
      assertNoUnsafeData(res);
    });

    it("returns each shelf", () => {
      const friends = TrendingResponseSchema.shape.friends.parse(
        call("GET", "/trending/friends"),
      );
      expect(friends.games[0].sampleFriends?.length).toBeGreaterThan(0);
      expect(friends.meta.friendsTotal).toBe(3);

      const global = TrendingResponseSchema.shape.global.parse(
        call("GET", "/trending/global"),
      );
      expect(global.games.map((g) => g.rank)).toEqual(
        global.games.map((_, index) => index + 1),
      );
      expect(global.meta.source).toBe("steam_charts");

      for (const path of ["concurrent", "deck", "top-releases"]) {
        const shelf = TrendingShelfSchema.parse(call("GET", `/trending/${path}`));
        expect(shelf.games.length).toBeGreaterThan(0);
        assertNoUnsafeData(shelf);
      }
    });

    it("marks ownership and computes dates at call time", () => {
      const first = call("GET", "/trending/global");
      expect(
        first.games.find((g: { appId: number }) => g.appId === IT_TAKES_TWO)?.owned,
      ).toBe(false);
      vi.setSystemTime(new Date(NOW.getTime() + 86_400_000));
      const second = call("GET", "/trending/global");
      expect(second.meta.rollupDate).not.toBe(first.meta.rollupDate);
    });
  });

  describe("multiplayer plan", () => {
    it("returns a populated plan for a well-formed request", () => {
      const res = MultiplayerPlanResponseSchema.parse(
        call("POST", "/multiplayer/plan", {
          body: {
            friendSteamIds: [NOVA.steamId, QUILL.steamId],
            minPlayers: 2,
            maxPlayers: 8,
            minYear: 2000,
            maxYear: 2100,
            suggested: true,
          },
        }),
      );
      expect(res.friendCount).toBe(2);
      expect(res.games.length).toBeGreaterThan(0);
      const statuses = new Set(res.games.map((game) => game.ownership));
      expect(statuses.has("shared")).toBe(true);
      expect(statuses.has("partial")).toBe(true);
      const suggestion = res.games.find((game) => game.isSuggested);
      expect(suggestion?.appId).toBe(IT_TAKES_TWO);
      expect(suggestion?.ownedByYou).toBe(false);
      assertNoUnsafeData(res);
    });

    it("applies strict matching and sort from a valid body", () => {
      const strict = MultiplayerPlanResponseSchema.parse(
        call("POST", "/multiplayer/plan", {
          body: {
            friendSteamIds: [MOSS.steamId],
            strictLibraryMatching: true,
            maxPlayers: 16,
            sortBy: "name",
          },
        }),
      );
      expect(strict.games.length).toBeGreaterThan(0);
      expect(strict.games.every((g) => g.ownership === "shared")).toBe(true);
      const names = strict.games.map((g) => g.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["string", "not json"],
      ["number", 42],
      ["array", [1, 2, 3]],
      ["nested junk", { friendSteamIds: { a: [{ b: 1 }] }, minPlayers: "x", sortBy: {} }],
      ["out of range", { minPlayers: 999, maxPlayers: -1, minYear: 0 }],
      ["proto", JSON.parse('{"__proto__":{"polluted":true},"mode":"bad"}')],
    ])("does not throw on a malformed body: %s", (_label, body) => {
      const res = MultiplayerPlanResponseSchema.parse(
        call("POST", "/multiplayer/plan", { body }),
      );
      expect(res.games.length).toBeGreaterThan(0);
      expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it("does not echo unvalidated input", () => {
      const marker = "<script>alert(1)</script>";
      const res = call("POST", "/multiplayer/plan", {
        body: { friendSteamIds: [marker, "76561197960287930"], genre: marker },
      });
      const text = JSON.stringify(res);
      expect(text).not.toContain("script");
      expect(text).not.toContain("76561197960287930");
      expect(res.friendCount).toBe(0);
    });
  });
});
