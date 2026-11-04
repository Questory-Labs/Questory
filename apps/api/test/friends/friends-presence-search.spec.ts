import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendsService } from "../../src/friends/friends.service";
import {
  friendPresenceFromSummary,
  isOnlinePersonaState,
} from "../../src/friends/friend-presence";

describe("friendPresenceFromSummary", () => {
  const at = new Date("2026-10-01T00:00:00Z");

  it("maps Steam presence fields", () => {
    expect(
      friendPresenceFromSummary(
        {
          steamid: "1",
          personaname: "A",
          profileurl: "",
          avatarfull: "",
          personastate: 1,
          gameid: "548430",
          gameextrainfo: "Deep Rock Galactic",
          lastlogoff: 1_700_000_000,
        },
        at,
      ),
    ).toEqual({
      personaState: 1,
      currentAppId: 548430,
      currentGameName: "Deep Rock Galactic",
      lastLogoffAt: new Date(1_700_000_000_000),
      presenceSyncedAt: at,
    });
  });

  it("drops non-Steam shortcut game ids and missing summaries", () => {
    const res = friendPresenceFromSummary(
      {
        steamid: "1",
        personaname: "A",
        profileurl: "",
        avatarfull: "",
        gameid: "13405229188034641920",
        gameextrainfo: "Shortcut",
      },
      at,
    );
    expect(res.currentAppId).toBeNull();
    expect(res.currentGameName).toBeNull();
    expect(friendPresenceFromSummary(undefined, at)).toMatchObject({
      personaState: null,
      currentAppId: null,
      lastLogoffAt: null,
    });
    expect(isOnlinePersonaState(0)).toBe(false);
    expect(isOnlinePersonaState(3)).toBe(true);
  });
});

describe("FriendsService.list search and presence", () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const aggregate = vi.fn();
  let service: FriendsService;

  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    aggregate.mockReset();
    const prisma = {
      friendship: { count, findMany, aggregate },
      friendLibraryCache: { groupBy: vi.fn().mockResolvedValue([]) },
      syncJob: { findFirst: vi.fn().mockResolvedValue(null) },
    } as any;
    service = new FriendsService(prisma, {} as any);
  });

  it("filters by q and returns presence plus online count", async () => {
    count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    aggregate.mockResolvedValue({
      _max: { presenceSyncedAt: new Date("2026-10-01T00:00:00Z") },
    });
    findMany
      .mockResolvedValueOnce([
        {
          friendSteamId: "s1",
          personaName: "Alice",
          avatarUrl: null,
          friendUserId: null,
          personaState: 1,
          currentAppId: 10,
          currentGameName: "CS",
          lastLogoffAt: null,
          presenceSyncedAt: new Date("2026-10-01T00:00:00Z"),
        },
      ])
      .mockResolvedValueOnce([{ friendSteamId: "s1" }, { friendSteamId: "s2" }]);

    const result = await service.list("u1", { q: "  ali " });

    expect(count).toHaveBeenNthCalledWith(1, {
      where: {
        userId: "u1",
        personaName: { contains: "ali", mode: "insensitive" },
      },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: { userId: "u1", personaState: { gt: 0 } },
    });
    expect(result.total).toBe(1);
    expect(result.meta.totalFriends).toBe(2);
    expect(result.meta.onlineCount).toBe(2);
    expect(result.meta.presenceSyncedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(result.friends[0]).toMatchObject({
      personaState: 1,
      currentAppId: 10,
      currentGameName: "CS",
      lastLogoffAt: null,
    });
  });
});

describe("FriendsService.compare common games", () => {
  it("sorts common games by combined playtime with per-side minutes", async () => {
    const game = (appId: number, name: string) => ({
      appId,
      name,
      headerImage: null,
      genres: "[]",
      isFree: false,
      currentPrice: null,
    });
    const prisma = {
      friendship: {
        findUnique: vi.fn().mockResolvedValue({
          friendSteamId: "f1",
          personaName: "Bob",
          avatarUrl: null,
          friendUserId: null,
        }),
      },
      libraryEntry: {
        findMany: vi.fn().mockResolvedValue([
          { playtimeForever: 10, game: game(1, "Low") },
          { playtimeForever: 500, game: game(2, "High") },
          { playtimeForever: 0, game: game(3, "Mine only") },
        ]),
      },
      friendLibraryCache: {
        findMany: vi.fn().mockResolvedValue([
          { gameAppId: 1, playtimeForever: 5 },
          { gameAppId: 2, playtimeForever: 100 },
        ]),
      },
      wishlistItem: { findMany: vi.fn().mockResolvedValue([]) },
      game: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;
    const accounts = { findUserBySteamId: vi.fn().mockResolvedValue(null) };
    const service = new FriendsService(prisma, accounts as any);

    const res = await service.compare("u1", "f1");

    expect(res.commonGameList.map((g) => g.appId)).toEqual([2, 1]);
    expect(res.commonGameList[0]).toMatchObject({
      yourPlaytimeMinutes: 500,
      friendPlaytimeMinutes: 100,
    });
  });
});
