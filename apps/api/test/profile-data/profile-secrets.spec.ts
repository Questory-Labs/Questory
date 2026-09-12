import { describe, expect, it } from "vitest";
import { zipProfileArchive } from "../../src/profile-data/profile-zip";

describe("profile export payload", () => {
  it("zip contents never include credential field names", () => {
    const json = JSON.stringify({
      format: "questory.profile",
      version: 1,
      exportedAt: "2026-08-29T12:00:00.000Z",
      services: ["steam", "trakt"],
      profile: { countryCode: "IN", priceRegionLocked: true },
    });
    const zip = zipProfileArchive(json, "Reconnect steam and trakt.");
    const text = zip.toString("utf8").toLowerCase();
    expect(text).not.toContain("accesstoken");
    expect(text).not.toContain("refreshtoken");
    expect(text).not.toContain("passwordhash");
    expect(text).not.toContain("tokenhash");
  });
});
