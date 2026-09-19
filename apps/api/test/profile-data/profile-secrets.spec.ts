import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
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
    const files = unzipSync(new Uint8Array(zip));
    const text = Object.values(files)
      .map((bytes) => strFromU8(bytes).toLowerCase())
      .join("\n");
    expect(text).not.toContain("accesstoken");
    expect(text).not.toContain("refreshtoken");
    expect(text).not.toContain("passwordhash");
    expect(text).not.toContain("tokenhash");
  });
});
