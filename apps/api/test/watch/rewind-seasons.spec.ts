import { describe, expect, it, vi } from "vitest";
import {
  countCompletedUnits,
  watchSeasonOutcomes,
} from "../../src/watch/analytics/rewind-seasons";
import type { PrismaService } from "../../src/prisma/prisma.service";

const bounds = {
  start: new Date("2026-09-01T00:00:00Z"),
  end: new Date("2026-10-01T00:00:00Z"),
};

describe("countCompletedUnits", () => {
  it("counts units finished inside the period only", () => {
    const targets = new Map([
      ["s:a", 2],
      ["s:b", 2],
      ["s:c", 3],
    ]);
    const at = (d: string) => new Date(d);
    expect(
      countCompletedUnits(
        targets,
        [
          { key: "s:a", episodeId: "a1", watchedAt: at("2026-08-20T00:00:00Z") },
          { key: "s:a", episodeId: "a2", watchedAt: at("2026-09-05T00:00:00Z") },
          { key: "s:b", episodeId: "b1", watchedAt: at("2026-08-01T00:00:00Z") },
          { key: "s:b", episodeId: "b2", watchedAt: at("2026-08-02T00:00:00Z") },
          { key: "s:c", episodeId: "c1", watchedAt: at("2026-09-02T00:00:00Z") },
          { key: "s:c", episodeId: "c1", watchedAt: at("2026-09-03T00:00:00Z") },
        ],
        bounds,
      ),
    ).toBe(1);
  });
});

describe("watchSeasonOutcomes", () => {
  it("derives completed seasons and dropped titles for the caller", async () => {
    const episodeFind = vi.fn().mockResolvedValue([
      {
        titleId: "t1",
        seasonId: "s1",
        season: { episodeCount: 2 },
        title: { totalEpisodes: null },
      },
      {
        titleId: "t2",
        seasonId: "s2",
        season: { episodeCount: null },
        title: { totalEpisodes: null },
      },
    ]);
    const eventFind = vi.fn().mockResolvedValue([
      { episodeId: "e1", titleId: "t1", watchedAt: new Date("2026-09-02T00:00:00Z"), episode: { seasonId: "s1" } },
      { episodeId: "e2", titleId: "t1", watchedAt: new Date("2026-09-03T00:00:00Z"), episode: { seasonId: "s1" } },
    ]);
    const listFind = vi.fn().mockResolvedValue([{ titleId: "t8" }, { titleId: "t9" }]);
    const prisma = {
      episode: { findMany: episodeFind },
      watchEvent: { findMany: eventFind },
      titleListState: { findMany: listFind },
    } as unknown as PrismaService;

    const out = await watchSeasonOutcomes(prisma, "u1", bounds, ["e1", "e2", "e2"]);
    expect(out).toEqual({ completedSeasons: 1, droppedTitles: 2 });
    expect(listFind.mock.calls[0]![0]).toMatchObject({
      where: { userId: "u1", listType: "dropped" },
      distinct: ["titleId"],
      take: expect.any(Number),
    });
    expect(eventFind.mock.calls[0]![0].where.userId).toBe("u1");
    expect(eventFind.mock.calls[0]![0].take).toBeGreaterThan(0);
  });

  it("skips history lookups when nothing has a known episode count", async () => {
    const eventFind = vi.fn();
    const prisma = {
      episode: { findMany: vi.fn().mockResolvedValue([]) },
      watchEvent: { findMany: eventFind },
      titleListState: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const out = await watchSeasonOutcomes(prisma, "u1", bounds, []);
    expect(out).toEqual({ completedSeasons: 0, droppedTitles: 0 });
    expect(eventFind).not.toHaveBeenCalled();
  });
});
