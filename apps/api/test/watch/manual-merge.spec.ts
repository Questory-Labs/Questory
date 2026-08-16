import { describe, expect, it } from "vitest";
import { mergeSearchHits, searchHitId } from "../../src/watch/manual/manual-merge";
import type { ManualProviderHit } from "../../src/watch/manual/manual-merge";

const tmdbMovie = (name: string, year: number, id: number): ManualProviderHit => ({
  name,
  year,
  type: "movie",
  posterUrl: null,
  tmdbId: id,
  sources: ["tmdb"],
});

const tmdbShow = (name: string, year: number, id: number): ManualProviderHit => ({
  name,
  year,
  type: "show",
  posterUrl: "https://tmdb.test/p.jpg",
  tmdbId: id,
  originCountry: "JP",
  sources: ["tmdb"],
});

const anilistShow = (name: string, year: number, id: number): ManualProviderHit => ({
  name,
  year,
  type: "show",
  posterUrl: "https://al.test/p.jpg",
  anilistId: id,
  sources: ["anilist"],
});

describe("mergeSearchHits", () => {
  it("collapses the same anime from TMDB and AniList", () => {
    const merged = mergeSearchHits(
      [tmdbShow("Frieren", 2023, 209867)],
      [anilistShow("Frieren", 2023, 154587)],
      10,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      name: "Frieren",
      tmdbId: 209867,
      anilistId: 154587,
      posterUrl: "https://al.test/p.jpg",
      sources: ["tmdb", "anilist"],
    });
    expect(searchHitId(merged[0])).toBe("tmdb:209867:al:154587");
  });

  it("keeps live-action TMDB titles that AniList does not have", () => {
    const merged = mergeSearchHits(
      [tmdbMovie("Heat", 1995, 949), tmdbShow("Frieren", 2023, 209867)],
      [anilistShow("Frieren", 2023, 154587)],
      10,
    );
    expect(merged.map((h) => h.name)).toEqual(["Heat", "Frieren"]);
    expect(merged[0].sources).toEqual(["tmdb"]);
    expect(merged[1].anilistId).toBe(154587);
  });
});
