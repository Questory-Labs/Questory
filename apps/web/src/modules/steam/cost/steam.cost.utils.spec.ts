import { describe, expect, it } from "vitest";
import {
  costBarPct,
  costRowHref,
  costRowKey,
  roiEmptyMessage,
} from "./steam.cost.utils";

describe("roiEmptyMessage", () => {
  it("explains missing prices when the ranking is empty", () => {
    expect(roiEmptyMessage(0, "paid")).toBe(
      "Price data will appear after the next store sync.",
    );
  });

  it("names the paid or free filter when no playtime ranks", () => {
    expect(roiEmptyMessage(4, "paid")).toBe(
      "No paid games with playtime to rank.",
    );
    expect(roiEmptyMessage(4, "free")).toBe(
      "No free games with playtime to rank.",
    );
  });

  it("drops the paid/free wording for the all filter", () => {
    expect(roiEmptyMessage(4, "all")).toBe("No games with playtime to rank.");
  });
});

describe("costRowKey", () => {
  it("prefers gameId, then appId, then name", () => {
    expect(
      costRowKey({ gameId: "g1", appId: 10, name: "Portal" }),
    ).toBe("g1");
    expect(costRowKey({ appId: 10, name: "Portal" })).toBe("10");
    expect(costRowKey({ appId: null, name: "Portal" })).toBe("Portal");
  });
});

describe("costRowHref", () => {
  it("links to the library page when gameId is present", () => {
    expect(costRowHref({ gameId: "g1" })).toBe("/library/g1");
    expect(costRowHref({})).toBeNull();
  });
});

describe("costBarPct", () => {
  it("scales against the largest slice and floors tiny bars", () => {
    expect(costBarPct(80, 100)).toBe(80);
    expect(costBarPct(1, 100)).toBe(4);
    expect(costBarPct(0, 100)).toBe(0);
    expect(costBarPct(10, 0)).toBe(0);
  });
});
