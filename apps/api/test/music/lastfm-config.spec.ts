import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isLastFmConfigured } from "../../src/music/lib/runtime-config";

describe("isLastFmConfigured", () => {
  const keys = [
    "LASTFM_API_KEY",
    "LASTFM_API_SECRET",
    "LASTFM_REDIRECT_URI",
  ] as const;
  const previous: Partial<Record<(typeof keys)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const key of keys) previous[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("is false unless key, secret, and redirect URI are all set", () => {
    process.env.LASTFM_API_KEY = "key";
    process.env.LASTFM_API_SECRET = "secret";
    delete process.env.LASTFM_REDIRECT_URI;
    expect(isLastFmConfigured()).toBe(false);

    process.env.LASTFM_REDIRECT_URI =
      "http://localhost:4000/v1/music/scrobbler/lastfm/callback";
    expect(isLastFmConfigured()).toBe(true);
  });
});
