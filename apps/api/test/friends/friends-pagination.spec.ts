import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendsService } from "../../src/friends/friends.service";
import { FRIENDS_PAGE_SIZE } from "../../src/friends/friends.constants";

describe("FriendsService.list pagination", () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const groupBy = vi.fn();
  const syncJobFindFirst = vi.fn();
  let service: FriendsService;

  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    groupBy.mockReset();
    syncJobFindFirst.mockReset();
    syncJobFindFirst.mockResolvedValue(null);
    groupBy.mockResolvedValue([]);
    const prisma = {
      friendship: { count, findMany },
      friendLibraryCache: { groupBy },
      syncJob: { findFirst: syncJobFindFirst },
    } as any;
    service = new FriendsService(prisma, {} as any);
  });

  it("returns total/page/pageSize and skips to the requested page", async () => {
    count.mockResolvedValue(30);
    findMany
      .mockResolvedValueOnce([
        {
          friendSteamId: "76561198000000001",
          personaName: "Alice",
          avatarUrl: null,
          friendUserId: null,
        },
      ])
      .mockResolvedValueOnce([
        { friendSteamId: "76561198000000001" },
        { friendSteamId: "76561198000000002" },
      ]);

    const result = await service.list("user-1", { page: 2, pageSize: 15 });

    expect(result).toMatchObject({
      total: 30,
      page: 2,
      pageSize: 15,
    });
    expect(result.friends).toHaveLength(1);
    expect(result.friends[0]).toMatchObject({ personaName: "Alice" });
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { userId: "user-1" },
        skip: 15,
        take: 15,
      }),
    );
  });

  it("defaults to FRIENDS_PAGE_SIZE", async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    const result = await service.list("user-1");

    expect(result.pageSize).toBe(FRIENDS_PAGE_SIZE);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: FRIENDS_PAGE_SIZE,
        skip: 0,
      }),
    );
  });
});
