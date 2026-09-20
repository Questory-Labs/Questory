import { describe, expect, it } from "vitest";
import {
  AppStatusSchema,
  PatchFeatureFlagsSchema,
  featureDisabledMessage,
} from "./feature-flags";

describe("AppStatusSchema", () => {
  it("accepts a full status payload", () => {
    const parsed = AppStatusSchema.safeParse({
      music: { enabled: true },
      watch: { enabled: false },
      read: { enabled: true },
      sources: {
        lastfm: true,
        listenbrainzIngest: true,
        listenbrainzApi: false,
        spotify: true,
        musicbrainz: true,
        musicImports: true,
        trakt: true,
        tmdb: true,
        anilist: false,
        mal: true,
        kitsu: true,
        shikimori: true,
        bangumi: true,
        letterboxdImport: true,
        letterboxdScrape: true,
        watchWebhooks: true,
      },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("PatchFeatureFlagsSchema", () => {
  it("accepts a partial domain patch", () => {
    const parsed = PatchFeatureFlagsSchema.safeParse({
      features: { music: true },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown source keys", () => {
    const parsed = PatchFeatureFlagsSchema.safeParse({
      sources: { steam: true },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("featureDisabledMessage", () => {
  it("names the domain", () => {
    expect(featureDisabledMessage("music")).toBe(
      "Music is disabled on this instance",
    );
  });
});
