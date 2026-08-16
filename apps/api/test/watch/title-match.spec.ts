import { describe, expect, it, vi } from "vitest";
import {
  findTitleByName,
  namePrefixCandidates,
  namesLikelySame,
  yearsCompatible,
} from "../../src/watch/catalog/title-match";
import type { PrismaService } from "../../src/prisma/prisma.service";

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

describe("findTitleByName", () => {
  it("loads exact nameNormalized matches before applying the take limit", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "exact-1",
        name: "Heat",
        nameNormalized: "heat",
        year: 1995,
        tmdbId: 949,
      },
    ]);
    const prisma = { title: { findMany } } as unknown as PrismaService;

    const found = await findTitleByName(prisma, {
      type: "movie",
      name: "Heat",
      year: 1995,
    });

    expect(found?.id).toBe("exact-1");
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ nameNormalized: "heat" }),
        orderBy: [
          { tmdbId: { sort: "desc", nulls: "last" } },
          { id: "asc" },
        ],
        take: 25,
      }),
    );
    expect(findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });
});
