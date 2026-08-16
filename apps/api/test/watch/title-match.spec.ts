import { describe, expect, it } from "vitest";
import {
  namePrefixCandidates,
  namesLikelySame,
  yearsCompatible,
} from "../../src/watch/catalog/title-match";

describe("yearsCompatible", () => {
  it("treats a missing year as compatible", () => {
    expect(yearsCompatible(1995, null)).toBe(true);
    expect(yearsCompatible(null, 2023)).toBe(true);
  });

  it("allows a one-year drift", () => {
    expect(yearsCompatible(2023, 2024)).toBe(true);
    expect(yearsCompatible(1995, 1997)).toBe(false);
  });
});

describe("namesLikelySame", () => {
  it("matches exact normalized names", () => {
    expect(namesLikelySame("Heat", "heat")).toBe(true);
  });

  it("matches a TMDB anime title to a shorter AniList name", () => {
    expect(
      namesLikelySame("Frieren", "Frieren: Beyond Journey's End"),
    ).toBe(true);
  });

  it("does not merge short tokens like Heat into Heat 2", () => {
    expect(namesLikelySame("Heat", "Heat 2")).toBe(false);
  });
});

describe("namePrefixCandidates", () => {
  it("emits prefixes of at least 5 characters", () => {
    expect(namePrefixCandidates("frieren beyond journeys end")).toEqual([
      "frieren",
      "frieren beyond",
      "frieren beyond journeys",
    ]);
  });
});
