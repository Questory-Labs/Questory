import { beforeEach, describe, expect, it, vi } from "vitest";
import { WishlistService } from "../../src/wishlist/wishlist.service";
import { WISHLIST_PAGE_SIZE } from "../../src/wishlist/wishlist.constants";

describe("WishlistService.list pagination", () => {
  const count = vi.fn();
  const findMany = vi.fn();
  let service: WishlistService;

  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    const prisma = {
      wishlistItem: { count, findMany },
    } as any;
    service = new WishlistService(prisma);
  });

  it("returns total/page/pageSize and skips to the requested page", async () => {
    count.mockResolvedValue(38);
    findMany.mockResolvedValue([
      {
        id: "w1",
        store: "steam",
        externalId: "570",
        appId: 570,
        gameId: "g1",
        name: "Dota 2",
        headerImage: null,
        priority: 1,
        dateAdded: new Date("2026-01-01"),
        targetPrice: 10,
        currentPrice: 8,
        lowestPrice: 5,
        shouldBuyScore: 80,
        genres: '["Action"]',
      },
    ]);

    const result = await service.list("user-1", "steam", { page: 2, pageSize: 15 });

    expect(result).toMatchObject({
      total: 38,
      page: 2,
      pageSize: 15,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ name: "Dota 2", store: "steam" });
    expect(count).toHaveBeenCalledWith({
      where: { userId: "user-1", store: "steam" },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", store: "steam" },
        skip: 15,
        take: 15,
      }),
    );
  });

  it("defaults to WISHLIST_PAGE_SIZE", async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    const result = await service.list("user-1");

    expect(result.pageSize).toBe(WISHLIST_PAGE_SIZE);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: WISHLIST_PAGE_SIZE,
        skip: 0,
      }),
    );
  });
});
