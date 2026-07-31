import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItadService } from "../../src/steam/itad.service";
import type { CacheService } from "../../src/cache/cache.service";

const CUPHEAD_UUID = "018d937e-ffba-7200-8bc4-99eccd424fa1";

describe("ItadService price parsing", () => {
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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ITAD_API_KEY;
    else process.env.ITAD_API_KEY = originalKey;
  });

  it("requests overview with ITAD UUIDs and maps INR major units", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/lookup/id/shop/61/v1")) {
        return new Response(JSON.stringify({ "app/268910": CUPHEAD_UUID }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/games/overview/v2")) {
        const body = JSON.parse(String(init?.body)) as string[];
        expect(body).toEqual([CUPHEAD_UUID]);
        return new Response(
          JSON.stringify({
            prices: [
              {
                id: CUPHEAD_UUID,
                current: {
                  price: { amount: 565, amountInt: 56500, currency: "INR" },
                },
                lowest: {
                  price: { amount: 339, amountInt: 33900, currency: "INR" },
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("", { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const prices = await service.getSteamPrices([268910], "IN");

    expect(prices[268910]).toEqual({
      current: 565,
      lowest: 339,
      currency: "INR",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/games/overview/v2"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify([CUPHEAD_UUID]),
      }),
    );
    expect(cache.setJson).toHaveBeenCalledWith(
      expect.stringContaining("itad:prices:v5:"),
      expect.objectContaining({
        "268910": { current: 565, lowest: 339, currency: "INR" },
      }),
      1800,
    );
  });

  it("normalizes amountInt leaked as amount", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/lookup/id/shop/61/v1")) {
        return new Response(JSON.stringify({ "app/268910": CUPHEAD_UUID }), {
          status: 200,
        });
      }
      if (url.includes("/games/overview/v2")) {
        return new Response(
          JSON.stringify({
            prices: [
              {
                id: CUPHEAD_UUID,
                current: {
                  price: { amount: 56500, amountInt: 56500, currency: "INR" },
                },
                lowest: null,
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const prices = await service.getSteamPrices([268910], "IN");
    expect(prices[268910].current).toBe(565);
  });
});
