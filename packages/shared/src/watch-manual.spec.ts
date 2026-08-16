import { describe, expect, it } from "vitest";
import {
  WatchCatalogLogSchema,
  WatchCatalogSearchHitSchema,
  WatchCatalogSearchQuerySchema,
} from "./watch-manual";

describe("WatchCatalogSearchQuerySchema", () => {
  it("trims and accepts a query", () => {
    expect(WatchCatalogSearchQuerySchema.parse({ q: "  heat  " }).q).toBe(
      "heat",
    );
  });

  it("rejects empty query", () => {
    expect(WatchCatalogSearchQuerySchema.safeParse({ q: "  " }).success).toBe(
      false,
    );
  });
});

describe("WatchCatalogSearchHitSchema", () => {
  it("accepts a merged TMDB + AniList hit", () => {
    const parsed = WatchCatalogSearchHitSchema.safeParse({
      id: "tmdb:1:al:2",
      name: "Frieren",
      year: 2023,
      type: "show",
      posterUrl: "https://example.test/p.jpg",
      tmdbId: 1,
      anilistId: 2,
      sources: ["tmdb", "anilist"],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("WatchCatalogLogSchema", () => {
  it("accepts a movie log with tmdbId", () => {
    const parsed = WatchCatalogLogSchema.safeParse({
      tmdbId: 603,
      type: "movie",
      watchedAt: "2026-08-16",
      rating: 4.5,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an AniList-only show log", () => {
    const parsed = WatchCatalogLogSchema.safeParse({
      anilistId: 154587,
      type: "show",
      watchedAt: "2026-08-16",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a log with neither provider id", () => {
    const parsed = WatchCatalogLogSchema.safeParse({
      type: "movie",
      watchedAt: "2026-08-16",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a show without season and episode", () => {
    const parsed = WatchCatalogLogSchema.safeParse({
      tmdbId: 10,
      type: "show",
      watchedAt: "2026-08-16",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects ratings that are not half-star steps", () => {
    const parsed = WatchCatalogLogSchema.safeParse({
      tmdbId: 1,
      type: "movie",
      watchedAt: "2026-08-16",
      rating: 3.3,
    });
    expect(parsed.success).toBe(false);
  });
});
