import { afterEach, describe, expect, it, vi } from "vitest";
import { CacheService } from "../../src/cache/cache.service";
import { MEDIA_TRENDING_TOP_N } from "../../src/lib/media-trending-shelf";
import { MusicTrendingService } from "../../src/music/trending/trending.service";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("MusicTrendingService.sitewide", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps ListenBrainz artists and keeps the week window", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          payload: {
            from_ts: 1_756_598_400,
            to_ts: 1_757_203_199,
            artists: [
              { artist_mbid: "mbid-1", artist_name: "Radiohead", listen_count: 9 },
            ],
          },
        }),
      ),
    );
    const svc = new MusicTrendingService(new CacheService());
    const shelf = await svc.sitewide();
    expect(shelf.items[0]?.name).toBe("Radiohead");
    expect(shelf.meta.source).toBe("listenbrainz");
    expect(shelf.meta.windowLabel).toContain("ListenBrainz week");
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      `count=${MEDIA_TRENDING_TOP_N}`,
    );
  });

  it("does not cache a 429 empty as success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse("nope", 429));
    vi.stubGlobal("fetch", fetchMock);
    const svc = new MusicTrendingService(new CacheService());
    await svc.sitewide();
    const callsAfterFirst = fetchMock.mock.calls.length;
    await svc.sitewide();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
