import { describe, expect, it } from "vitest";
import { API_KEY_TYPES } from "../../src/accounts/account.constants";
import {
  SOURCE_DOMAIN_PROVIDERS,
  SOURCES_ERROR_MAX,
  SOURCES_ROW_LIMIT,
} from "../../src/sources/sources.constants";

const defs = Object.values(SOURCE_DOMAIN_PROVIDERS).flat();

describe("SOURCE_DOMAIN_PROVIDERS", () => {
  it("covers music, watch and read", () => {
    expect(Object.keys(SOURCE_DOMAIN_PROVIDERS).sort()).toEqual([
      "music",
      "read",
      "watch",
    ]);
  });

  it.each(Object.entries(SOURCE_DOMAIN_PROVIDERS))(
    "%s lists each provider once",
    (_domain, providers) => {
      const names = providers.map((p) => p.provider);
      expect(new Set(names).size).toBe(names.length);
    },
  );

  it("lists the expected providers per domain", () => {
    const names = (domain: keyof typeof SOURCE_DOMAIN_PROVIDERS) =>
      SOURCE_DOMAIN_PROVIDERS[domain].map((p) => p.provider);
    expect(names("music")).toEqual(["lastfm", "music_ingest"]);
    expect(names("watch")).toEqual([
      "trakt",
      "anilist",
      "mal",
      "kitsu",
      "bangumi",
      "shikimori",
      "letterboxd",
      "watch_webhook",
    ]);
    expect(names("read")).toEqual([
      "anilist",
      "mal",
      "kitsu",
      "bangumi",
      "shikimori",
    ]);
  });

  it("api_key providers are real, non-public key types", () => {
    const keyDefs = defs.filter((d) => d.kind === "api_key");
    expect(keyDefs.map((d) => d.provider).sort()).toEqual([
      "music_ingest",
      "watch_webhook",
    ]);
    for (const def of keyDefs) {
      expect(API_KEY_TYPES).toContain(def.provider);
      expect(def.provider).not.toBe("public");
    }
  });

  it("shows accounts only for username-based sources", () => {
    expect(
      defs.filter((d) => d.showAccount).map((d) => d.provider).sort(),
    ).toEqual(["lastfm", "letterboxd"]);
  });

  it("uses positive bounds", () => {
    expect(SOURCES_ROW_LIMIT).toBeGreaterThan(0);
    expect(SOURCES_ERROR_MAX).toBeGreaterThan(0);
  });
});
