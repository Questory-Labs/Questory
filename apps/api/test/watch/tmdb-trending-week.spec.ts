import { describe, expect, it, vi } from "vitest";
import { TmdbService } from "../../src/watch/tmdb/tmdb.service";

describe("TmdbService.trendingWeek", () => {
  it("returns an empty list when unconfigured", async () => {
    const tmdb = new TmdbService();
    vi.spyOn(tmdb, "configured").mockReturnValue(false);
    await expect(tmdb.trendingWeek()).resolves.toEqual([]);
  });
});
