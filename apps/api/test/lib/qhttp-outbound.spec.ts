import { afterEach, describe, expect, it, vi } from "vitest";
import { providerFetch, toFetchStatus } from "../../src/lib/qhttp-outbound";

describe("toFetchStatus", () => {
  it("keeps valid HTTP statuses", () => {
    expect(toFetchStatus(200)).toBe(200);
    expect(toFetchStatus(404)).toBe(404);
    expect(toFetchStatus(599)).toBe(599);
  });

  it("clamps transport/network zero to 503", () => {
    expect(toFetchStatus(0)).toBe(503);
    expect(toFetchStatus(99)).toBe(503);
    expect(toFetchStatus(600)).toBe(503);
  });
});

describe("providerFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a 503 Response when fetch rejects instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const res = await providerFetch("https://example.test/tmdb", undefined, {
      retries: 0,
    });

    expect(res.status).toBe(503);
    expect(res.ok).toBe(false);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/fetch failed|network/i);
  });
});
