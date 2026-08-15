import { describe, expect, it } from "vitest";
import { signLastFmParams } from "../../src/music/scrobbler/lastfm/lastfm.client";

describe("signLastFmParams", () => {
  it("sorts keys and excludes format from the signature", () => {
    const sig = signLastFmParams(
      {
        method: "auth.getToken",
        api_key: "abc",
        format: "json",
      },
      "secret",
    );
    const withoutFormat = signLastFmParams(
      { api_key: "abc", method: "auth.getToken" },
      "secret",
    );
    expect(sig).toBe(withoutFormat);
    expect(sig).toHaveLength(32);
  });
});
