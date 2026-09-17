import { afterEach, describe, expect, it, vi } from "vitest";
import { CacheService } from "../../src/cache/cache.service";
import { ReadTrendingService } from "../../src/read/trending/trending.service";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ReadTrendingService.anilistNow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("labels the shelf trending now, not last week", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            Page: {
              media: [
                {
                  id: 42,
                  title: { english: "One Piece", romaji: "One Piece" },
                  format: "MANGA",
                  coverImage: { large: "https://cdn.example/op.jpg" },
                },
              ],
            },
          },
        }),
      ),
    );
    const svc = new ReadTrendingService(new CacheService());
    const shelf = await svc.anilistNow();
    expect(shelf.items[0]?.name).toBe("One Piece");
    expect(shelf.meta.windowLabel).toBe("Trending now");
    expect(shelf.meta.windowLabel.toLowerCase()).not.toContain("week");
  });
});
