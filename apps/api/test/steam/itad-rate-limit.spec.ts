import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItadService } from "../../src/steam/itad.service";
import type { CacheService } from "../../src/cache/cache.service";

/** initial attempt + MAX_429_RETRIES (3) */
const MAX_ATTEMPTS = 4;

describe("ItadService 429 handling", () => {
  const cache = {
    getJson: vi.fn(),
    setJson: vi.fn(),
  };
  let service: ItadService;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ITAD_API_KEY;

  beforeEach(() => {
    process.env.ITAD_API_KEY = "test-key";
    cache.getJson.mockReset().mockResolvedValue(null);
    cache.setJson.mockReset().mockResolvedValue(undefined);
    service = new ItadService(cache as unknown as CacheService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    if (originalKey === undefined) delete process.env.ITAD_API_KEY;
    else process.env.ITAD_API_KEY = originalKey;
  });

  it("waits Retry-After, retries, and does not cache 429 as not-found", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("", {
          status: 429,
          headers: { "Retry-After": "2" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ found: true, game: { id: "uuid-1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const promise = service.lookupByShop("steam", "123");
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(promise).resolves.toBe("uuid-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cache.setJson).toHaveBeenCalledWith(
      "itad:lookup:shop:steam:123",
      { id: "uuid-1" },
      86400,
    );
    expect(cache.setJson).not.toHaveBeenCalledWith(
      expect.anything(),
      { id: null },
      expect.anything(),
    );
  });

  it("does not cache null when retries are exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("", {
        status: 429,
        headers: { "Retry-After": "1" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const promise = service.lookupByShop("steam", "456");
    // initial + 3 retries, each waiting Retry-After=1s
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toBeNull();

    expect(fetchMock.mock.calls.length).toBe(MAX_ATTEMPTS);
    expect(cache.setJson).not.toHaveBeenCalled();
  });
});

