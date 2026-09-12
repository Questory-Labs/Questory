import { describe, expect, it, vi } from "vitest";
import { CacheService } from "../../src/cache/cache.service";
import { WatchTrendingService } from "../../src/watch/trending/trending.service";
import { TmdbService } from "../../src/watch/tmdb/tmdb.service";

describe("WatchTrendingService.tmdbWeek", () => {
  it("returns an empty 200 shelf when TMDB is not configured", async () => {
    const tmdb = new TmdbService();
    vi.spyOn(tmdb, "trendingWeek").mockResolvedValue([]);
    const svc = new WatchTrendingService(new CacheService(), tmdb);
    const shelf = await svc.tmdbWeek();
    expect(shelf.items).toEqual([]);
    expect(shelf.meta.windowLabel).toContain("Last 7 days");
  });

  it("does not cache a failed TMDB fetch", async () => {
    const tmdb = new TmdbService();
    const trendingWeek = vi
      .spyOn(tmdb, "trendingWeek")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([
        {
          id: 1,
          title: "Heat",
          media_type: "movie",
          poster_path: "/h.jpg",
        },
      ]);
    const svc = new WatchTrendingService(new CacheService(), tmdb);
    expect((await svc.tmdbWeek()).items).toEqual([]);
    expect((await svc.tmdbWeek()).items[0]?.name).toBe("Heat");
    expect(trendingWeek).toHaveBeenCalledTimes(2);
  });
});
