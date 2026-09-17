import { afterEach, describe, expect, it, vi } from "vitest";
import { CacheService } from "../../src/cache/cache.service";
import {
  cachedMediaShelf,
  emptyMediaShelf,
} from "../../src/lib/media-trending-shelf";

describe("cachedMediaShelf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not cache a null load (429/failure)", async () => {
    const cache = new CacheService();
    const empty = emptyMediaShelf({
      source: "listenbrainz",
      windowLabel: "week",
    });
    const load = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        items: [{ id: "1", name: "A", imageUrl: null, rank: 1 }],
        meta: { source: "listenbrainz", windowLabel: "week" },
      });

    const first = await cachedMediaShelf(cache, "t:null", empty, load);
    expect(first.items).toEqual([]);
    const second = await cachedMediaShelf(cache, "t:null", empty, load);
    expect(second.items[0]?.name).toBe("A");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("caches a successful shelf", async () => {
    const cache = new CacheService();
    const empty = emptyMediaShelf({ source: "tmdb", windowLabel: "7d" });
    const load = vi.fn().mockResolvedValue({
      items: [{ id: "1", name: "Heat", imageUrl: null, rank: 1 }],
      meta: { source: "tmdb", windowLabel: "7d" },
    });

    const first = await cachedMediaShelf(cache, "t:ok", empty, load);
    const second = await cachedMediaShelf(cache, "t:ok", empty, load);
    expect(first.meta.cached).toBe(false);
    expect(second.meta.cached).toBe(true);
    expect(second.items[0]?.name).toBe("Heat");
    expect(load).toHaveBeenCalledTimes(1);
  });
});
