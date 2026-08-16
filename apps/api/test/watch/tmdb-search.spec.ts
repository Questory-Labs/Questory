import { describe, expect, it, vi } from "vitest";
import { TmdbService } from "../../src/watch/tmdb/tmdb.service";

describe("TmdbService.searchMulti", () => {
  it("drops person hits and caps results", async () => {
    const tmdb = new TmdbService();
    vi.spyOn(tmdb, "configured").mockReturnValue(true);
    vi.spyOn(
      tmdb as unknown as { get: TmdbService["get"] },
      "get",
    ).mockResolvedValue({
      results: [
        { id: 1, media_type: "person", name: "An Actor" },
        { id: 2, media_type: "movie", title: "Heat" },
        { id: 3, media_type: "tv", name: "The Wire" },
        { id: 4, media_type: "movie", title: "Heat 2" },
      ],
    });

    const hits = await tmdb.searchMulti("heat", 2);
    expect(hits?.map((h) => h.id)).toEqual([2, 3]);
  });

  it("returns an empty list when TMDB is not configured", async () => {
    const tmdb = new TmdbService();
    vi.spyOn(tmdb, "configured").mockReturnValue(false);
    await expect(tmdb.searchMulti("heat", 10)).resolves.toEqual([]);
  });
});
