import { describe, expect, it } from "vitest";
import { gameRefFrom } from "../../src/profile-data/profile-data.utils";

describe("gameRefFrom", () => {
  it("keeps supported listing stores", () => {
    expect(
      gameRefFrom({
        appId: 1,
        name: "Hades",
        storeListings: [{ store: "epic", externalId: "hades" }],
      }),
    ).toEqual({
      store: "epic",
      externalId: "hades",
      appId: 1,
      name: "Hades",
    });
  });

  it("falls back to steam appId when the listing store is unsupported", () => {
    expect(
      gameRefFrom({
        appId: 570,
        name: "Dota 2",
        storeListings: [{ store: "origin", externalId: "Origin.Dota" }],
      }),
    ).toEqual({
      store: "steam",
      externalId: "570",
      appId: 570,
      name: "Dota 2",
    });
  });

  it("returns null when the listing store is unsupported and there is no appId", () => {
    expect(
      gameRefFrom({
        appId: null,
        name: "Unknown",
        storeListings: [{ store: "origin", externalId: "Origin.X" }],
      }),
    ).toBeNull();
  });
});
