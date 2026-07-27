import { describe, expect, it } from "vitest";
import {
  extractSteamId,
  flattenOpenIdQuery,
} from "../../src/auth/openid-query";

describe("openid-query", () => {
  it("flattens nested openid keys", () => {
    const flat = flattenOpenIdQuery({
      openid: { claimed_id: "https://steamcommunity.com/openid/id/76561198000000000" },
    });
    expect(flat["openid.claimed_id"]).toContain("76561198000000000");
  });

  it("keeps dotted keys flat", () => {
    const flat = flattenOpenIdQuery({
      "openid.claimed_id":
        "https://steamcommunity.com/openid/id/76561198000000000",
    });
    expect(extractSteamId(flat["openid.claimed_id"]!)).toBe("76561198000000000");
  });

  it("rejects forged non-Steam claimed_id", () => {
    expect(extractSteamId("https://evil.example/id/76561198000000000")).toBeNull();
    expect(extractSteamId("https://steamcommunity.com/openid/id/abc")).toBeNull();
  });
});
