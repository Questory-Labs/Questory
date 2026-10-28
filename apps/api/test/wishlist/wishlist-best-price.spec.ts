import { describe, expect, it, vi } from "vitest";
import {
  bestListingPrice,
  WishlistService,
} from "../../src/wishlist/wishlist.service";

describe("bestListingPrice", () => {
  it("picks the cheapest known store price", () => {
    expect(
      bestListingPrice({ store: "steam", currentPrice: 20 }, [
        { store: "steam", currentPrice: 20, isFree: false },
        { store: "gog", currentPrice: 14.5, isFree: false },
        { store: "epic", currentPrice: null, isFree: false },
      ]),
    ).toEqual({ bestPrice: 14.5, bestStore: "gog" });
  });

  it("returns nulls when nothing is priced", () => {
    expect(bestListingPrice({ store: "steam", currentPrice: null }, [])).toEqual({
      bestPrice: null,
      bestStore: null,
    });
  });
});

describe("bestListingPrice currency", () => {
  const own = { store: "steam", currentPrice: 499 };

  it("ignores listings priced in another currency", () => {
    expect(
      bestListingPrice(
        own,
        [{ store: "gog", currentPrice: 9.99, isFree: false, priceCurrency: "USD" }],
        "INR",
      ),
    ).toEqual({ bestPrice: 499, bestStore: "steam" });
  });

  it("compares listings in the same currency and free listings in any", () => {
    expect(
      bestListingPrice(
        own,
        [{ store: "gog", currentPrice: 399, isFree: false, priceCurrency: "inr" }],
        "INR",
      ),
    ).toEqual({ bestPrice: 399, bestStore: "gog" });
    expect(
      bestListingPrice(
        own,
        [{ store: "epic", currentPrice: null, isFree: true, priceCurrency: null }],
        "INR",
      ),
    ).toEqual({ bestPrice: 0, bestStore: "epic" });
  });
});

describe("WishlistService.list item fields", () => {
  it("adds reasons, discount, regular and best price to every item", async () => {
    const prisma = {
      wishlistItem: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "w1",
            store: "steam",
            externalId: "570",
            appId: 570,
            gameId: "g1",
            name: "Game",
            headerImage: null,
            priority: 1,
            dateAdded: new Date(Date.now() - 100 * 86_400_000),
            targetPrice: null,
            currentPrice: 10,
            lowestPrice: 10,
            shouldBuyScore: 40,
            genres: "[]",
            discountPercent: 50,
            regularPrice: 20,
            game: {
              storeListings: [
                { store: "gog", currentPrice: 9, isFree: false, priceCurrency: "USD" },
                { store: "epic", currentPrice: 1, isFree: false, priceCurrency: "EUR" },
              ],
            },
          },
        ]),
      },
      user: { findUnique: vi.fn().mockResolvedValue({ countryCode: "US" }) },
    };
    const service = new WishlistService(prisma as never);
    const res = await service.list("u1");
    expect(res.items[0]).toMatchObject({
      discountPercent: 50,
      regularPrice: 20,
      bestPrice: 9,
      bestStore: "gog",
      reasons: ["Near historical low", "On wishlist a while"],
    });
    expect(prisma.wishlistItem.findMany.mock.calls[0][0].include).toBeDefined();
    const alerts = await service.dealAlerts("u1");
    expect(alerts[0]).toMatchObject({ reason: "historical_low", discountPercent: 50 });
  });
});
