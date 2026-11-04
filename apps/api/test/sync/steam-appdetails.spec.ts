import { describe, expect, it } from "vitest";
import {
  steamPlatforms,
  steamPriceFacts,
} from "../../src/sync/steam-appdetails";

describe("steamPlatforms", () => {
  it("lists supported platforms in a stable order", () => {
    expect(steamPlatforms({ windows: true, mac: false, linux: true })).toEqual([
      "windows",
      "linux",
    ]);
    expect(steamPlatforms(undefined)).toEqual([]);
  });
});

describe("steamPriceFacts", () => {
  it("reads discount percent and regular price from price_overview", () => {
    expect(
      steamPriceFacts({
        name: "x",
        price_overview: {
          final: 999,
          initial: 1999,
          discount_percent: 50,
          currency: "USD",
        },
      }),
    ).toEqual({ discountPercent: 50, regularPrice: 19.99 });
  });

  it("returns nulls without price_overview", () => {
    expect(steamPriceFacts({ name: "x", is_free: true })).toEqual({
      discountPercent: null,
      regularPrice: null,
    });
    expect(steamPriceFacts(null)).toEqual({
      discountPercent: null,
      regularPrice: null,
    });
  });
});
