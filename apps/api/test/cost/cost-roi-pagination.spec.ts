import { beforeEach, describe, expect, it, vi } from "vitest";
import { CostService } from "../../src/cost/cost.service";
import { COST_ROI_PAGE_SIZE } from "../../src/cost/cost.constants";

describe("CostService.roi pagination", () => {
  const findUnique = vi.fn();
  const purchaseFindMany = vi.fn();
  const libraryFindMany = vi.fn();
  let service: CostService;

  const libraryEntry = (
    appId: number,
    name: string,
    amount: number,
    playtimeMinutes: number,
    paid = false,
  ) => ({
    gameId: `game-${appId}`,
    pricePaid: paid ? amount : null,
    playtimeForever: playtimeMinutes,
    game: {
      appId,
      name,
      headerImage: null,
      isFree: amount === 0,
      currentPrice: amount,
      lowestPrice: amount,
      genres: '["Action"]',
      publishers: '["Valve"]',
      priceCurrency: "USD",
      storeListings: [],
    },
    ownerships: [],
  });

  beforeEach(() => {
    findUnique.mockReset();
    purchaseFindMany.mockReset();
    libraryFindMany.mockReset();
    findUnique.mockResolvedValue({ countryCode: "US" });
    purchaseFindMany.mockResolvedValue([]);
    const prisma = {
      user: { findUnique },
      purchase: { findMany: purchaseFindMany },
      libraryEntry: { findMany: libraryFindMany },
    } as any;
    const sync = { syncLibraryPrices: vi.fn() } as any;
    service = new CostService(prisma, sync);
  });

  it("returns total/page/pageSize and only the requested page of rankings", async () => {
    libraryFindMany.mockResolvedValue([
      libraryEntry(1, "Cheap long", 10, 600),
      libraryEntry(2, "Mid", 20, 120),
      libraryEntry(3, "Expensive short", 60, 60),
      libraryEntry(4, "Unranked", 5, 0),
    ]);

    const result = await service.roi("user-1", {
      page: 2,
      pageSize: 2,
      sort: "best",
      value: "paid",
    });

    expect(result).toMatchObject({
      total: 3,
      page: 2,
      pageSize: 2,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Expensive short");
  });

  it("sorts worst value highest cost/hour first", async () => {
    libraryFindMany.mockResolvedValue([
      libraryEntry(1, "Cheap long", 10, 600),
      libraryEntry(2, "Expensive short", 60, 60),
    ]);

    const result = await service.roi("user-1", {
      page: 1,
      pageSize: 10,
      sort: "worst",
      value: "paid",
    });

    expect(result.items.map((r) => r.name)).toEqual([
      "Expensive short",
      "Cheap long",
    ]);
  });

  it("defaults to COST_ROI_PAGE_SIZE", async () => {
    libraryFindMany.mockResolvedValue([libraryEntry(1, "A", 10, 120)]);

    const result = await service.roi("user-1");

    expect(result.pageSize).toBe(COST_ROI_PAGE_SIZE);
  });
});
