import { describe, expect, it, vi } from "vitest";
import { MultiplayerService } from "../../src/multiplayer/multiplayer.service";

const FRIEND = "76561198000000001";
const STRANGER = "76561198000000002";

function makeService() {
  const friendLibraryCache = {
    findMany: vi.fn().mockResolvedValue([{ gameAppId: 10, playtimeForever: 60 }]),
  };
  const friendship = {
    findMany: vi
      .fn()
      .mockResolvedValue([{ friendSteamId: FRIEND, personaName: "Friend" }]),
  };
  const prisma = {
    libraryEntry: { findMany: vi.fn().mockResolvedValue([]) },
    friendship,
    user: { findUnique: vi.fn().mockResolvedValue({ countryCode: "US" }) },
    friendLibraryCache,
    game: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const service = new MultiplayerService(prisma as never, {} as never, {} as never);
  return { service, friendLibraryCache, friendship };
}

const input = {
  minPlayers: 2,
  maxPlayers: 4,
  minYear: 2000,
  maxYear: 2030,
  sortBy: "name",
} as const;

describe("MultiplayerService.plan friend scoping", () => {
  it("reads cached libraries only for the caller's friends", async () => {
    const { service, friendLibraryCache, friendship } = makeService();
    const result = await service.plan("u1", {
      ...input,
      friendSteamIds: [FRIEND, STRANGER],
    } as never);

    expect(friendship.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", friendSteamId: { in: [FRIEND, STRANGER] } },
    });
    expect(friendLibraryCache.findMany).toHaveBeenCalledTimes(1);
    expect(friendLibraryCache.findMany.mock.calls[0]![0].where).toEqual({
      ownerSteamId: FRIEND,
    });
    expect(result.friendCount).toBe(1);
  });

  it("reads no cached library when no requested id is a friend", async () => {
    const { service, friendLibraryCache, friendship } = makeService();
    friendship.findMany.mockResolvedValue([]);
    const result = await service.plan("u1", {
      ...input,
      friendSteamIds: [STRANGER],
    } as never);

    expect(friendLibraryCache.findMany).not.toHaveBeenCalled();
    expect(result.friendCount).toBe(0);
  });
});
