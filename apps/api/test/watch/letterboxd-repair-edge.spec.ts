import { beforeEach, describe, expect, it, vi } from "vitest";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

type Overrides = {
  id: string;
  userId?: string;
  dedupeKey?: string;
  rating?: number | null;
  source?: string;
  watchedAt?: Date;
  createdAt?: Date;
  name?: string;
  year?: number | null;
};

const NOON = new Date("2024-01-01T12:00:00.000Z");
const CANONICAL = "letterboxd_csv:watch:film:2020:2024-01-01";

function event(o: Overrides) {
  return {
    id: o.id,
    userId: o.userId ?? "u1",
    titleId: `title-${o.id}`,
    watchedAt: o.watchedAt ?? NOON,
    dedupeKey: o.dedupeKey ?? CANONICAL,
    rating: o.rating ?? null,
    source: o.source ?? "letterboxd_csv",
    createdAt: o.createdAt ?? new Date("2024-02-01T00:00:00.000Z"),
    title: { name: o.name ?? "Film", year: o.year === undefined ? 2020 : o.year },
  };
}

describe("LetterboxdService.repairLetterboxdDuplicates edge cases", () => {
  const findMany = vi.fn();
  const deleteMany = vi.fn();
  const findUnique = vi.fn();
  const update = vi.fn();
  const rebuild = vi.fn();
  let service: LetterboxdService;

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    deleteMany.mockReset().mockResolvedValue({ count: 1 });
    findUnique.mockReset().mockResolvedValue(null);
    update.mockReset().mockResolvedValue({});
    rebuild.mockReset().mockResolvedValue(undefined);
    service = new LetterboxdService(
      {
        watchEvent: { findMany, deleteMany, findUnique, update },
      } as unknown as PrismaService,
      { rebuildWatchHourBuckets: rebuild } as unknown as CatalogService,
      { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
      { configured: () => false } as unknown as TmdbService,
      { resolveUser: vi.fn() } as unknown as UsersService,
    );
  });

  it("returns zero stats and rebuilds nothing with no events", async () => {
    await expect(service.repairLetterboxdDuplicates("u1")).resolves.toEqual({
      scanned: 0,
      groups: 0,
      legacyKeys: 0,
      alreadyCanonical: 0,
      duplicateGroups: 0,
      merged: 0,
      migrated: 0,
    });
    expect(rebuild).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("scopes the scan to the given user", async () => {
    await service.repairLetterboxdDuplicates("u1");
    expect(findMany.mock.calls[0][0].where).toEqual({
      OR: [
        { source: { in: ["letterboxd", "letterboxd_csv"] } },
        { dedupeKey: { startsWith: "letterboxd_csv:" } },
      ],
      userId: "u1",
    });
  });

  it("omits the user filter for a global repair", async () => {
    await service.repairLetterboxdDuplicates();
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty("userId");
  });

  it("leaves a canonical row untouched", async () => {
    findMany.mockResolvedValue([event({ id: "a" })]);
    const stats = await service.repairLetterboxdDuplicates("u1");
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(stats).toMatchObject({
      scanned: 1,
      groups: 1,
      alreadyCanonical: 1,
      merged: 0,
      migrated: 0,
    });
  });

  it("migrates a lone legacy key", async () => {
    findMany.mockResolvedValue([
      event({ id: "a", dedupeKey: "letterboxd_csv:diary:film:2024-01-01" }),
    ]);
    const stats = await service.repairLetterboxdDuplicates("u1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { dedupeKey: CANONICAL, rating: null, watchedAt: NOON },
    });
    expect(stats).toMatchObject({ legacyKeys: 1, migrated: 1, merged: 0 });
    expect(rebuild).toHaveBeenCalledWith("u1");
  });

  it("realigns watchedAt to noon on the legacy date", async () => {
    findMany.mockResolvedValue([
      event({
        id: "a",
        dedupeKey: "letterboxd_csv:watched:film:2024-01-01",
        watchedAt: new Date("2024-01-02T03:00:00.000Z"),
      }),
    ]);
    await service.repairLetterboxdDuplicates("u1");
    expect(update.mock.calls[0][0].data.watchedAt).toEqual(NOON);
  });

  it("never merges identical films across users", async () => {
    findMany.mockResolvedValue([
      event({ id: "a", userId: "u1" }),
      event({ id: "b", userId: "u2" }),
    ]);
    const stats = await service.repairLetterboxdDuplicates();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(stats.duplicateGroups).toBe(0);
    expect(stats.groups).toBe(2);
    expect(rebuild).toHaveBeenCalledWith("u1");
    expect(rebuild).toHaveBeenCalledWith("u2");
  });

  it("looks up conflicts within the owner's key space", async () => {
    findMany.mockResolvedValue([event({ id: "a", userId: "u2" })]);
    await service.repairLetterboxdDuplicates();
    expect(findUnique).toHaveBeenCalledWith({
      where: { userId_dedupeKey: { userId: "u2", dedupeKey: CANONICAL } },
    });
  });

  it("treats a conflict lookup returning the survivor as no conflict", async () => {
    findMany.mockResolvedValue([event({ id: "a" })]);
    findUnique.mockResolvedValue({ id: "a", rating: null });
    await service.repairLetterboxdDuplicates("u1");
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("folds into an existing canonical row and copies the rating", async () => {
    findMany.mockResolvedValue([
      event({
        id: "a",
        dedupeKey: "letterboxd_csv:diary:film:2024-01-01",
        rating: 4,
      }),
    ]);
    findUnique.mockResolvedValue({ id: "canon", rating: null });
    const stats = await service.repairLetterboxdDuplicates("u1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "canon" },
      data: { rating: 4 },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["a"] } },
    });
    expect(stats.merged).toBe(1);
    expect(rebuild).toHaveBeenCalledWith("u1");
  });

  it("keeps the rating already on a conflicting canonical row", async () => {
    findMany.mockResolvedValue([
      event({
        id: "a",
        dedupeKey: "letterboxd_csv:diary:film:2024-01-01",
        rating: 4,
      }),
    ]);
    findUnique.mockResolvedValue({ id: "canon", rating: 2 });
    await service.repairLetterboxdDuplicates("u1");
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  describe("survivor selection", () => {
    const pair = (a: Overrides, b: Overrides) => [
      event({ dedupeKey: "letterboxd_csv:watch:film:2020:2024-01-01", ...a }),
      event({ dedupeKey: "letterboxd_csv:watch:film:1999:2024-01-01", ...b }),
    ];

    const deletedIds = () => deleteMany.mock.calls[0][0].where.id.in;

    it("prefers a rated row over a CSV row", async () => {
      findMany.mockResolvedValue(
        pair(
          { id: "scrape", source: "letterboxd", rating: 5 },
          { id: "csv", source: "letterboxd_csv", rating: null },
        ),
      );
      await service.repairLetterboxdDuplicates("u1");
      expect(deletedIds()).toEqual(["csv"]);
    });

    it("prefers CSV over scrape when ratings tie", async () => {
      findMany.mockResolvedValue(
        pair(
          { id: "scrape", source: "letterboxd" },
          { id: "csv", source: "letterboxd_csv" },
        ),
      );
      await service.repairLetterboxdDuplicates("u1");
      expect(deletedIds()).toEqual(["scrape"]);
    });

    it("prefers a legacy diary key over a legacy watched key", async () => {
      findMany.mockResolvedValue([
        event({
          id: "watched",
          dedupeKey: "letterboxd_csv:watched:film:2024-01-01",
        }),
        event({
          id: "diary",
          dedupeKey: "letterboxd_csv:diary:film:2024-01-01",
        }),
      ]);
      await service.repairLetterboxdDuplicates("u1");
      expect(deletedIds()).toEqual(["watched"]);
    });

    it("prefers the oldest row on a full tie", async () => {
      findMany.mockResolvedValue(
        pair(
          { id: "newer", createdAt: new Date("2024-03-01T00:00:00.000Z") },
          { id: "older", createdAt: new Date("2024-02-01T00:00:00.000Z") },
        ),
      );
      await service.repairLetterboxdDuplicates("u1");
      expect(deletedIds()).toEqual(["newer"]);
    });

    it("rebuilds the key from any known year in the group", async () => {
      findMany.mockResolvedValue([
        event({
          id: "survivor",
          dedupeKey: "letterboxd_csv:watch:film::2024-01-01",
          year: null,
          rating: 3,
        }),
        event({
          id: "other",
          dedupeKey: "letterboxd_csv:watch:film:2020:2024-01-01",
          year: 2020,
        }),
      ]);
      await service.repairLetterboxdDuplicates("u1");
      expect(update).toHaveBeenCalledWith({
        where: { id: "survivor" },
        data: { dedupeKey: CANONICAL, rating: 3, watchedAt: NOON },
      });
    });

    it("keeps the rated row between two CSV rows", async () => {
      findMany.mockResolvedValue([
        event({ id: "first", source: "letterboxd_csv", rating: null }),
        event({
          id: "second",
          source: "letterboxd_csv",
          dedupeKey: "letterboxd_csv:watch:film:1999:2024-01-01",
          rating: 4,
        }),
      ]);
      const stats = await service.repairLetterboxdDuplicates("u1");
      expect(deletedIds()).toEqual(["first"]);
      expect(stats).toMatchObject({ duplicateGroups: 1, merged: 1, migrated: 0 });
    });
  });

  it("does not pair adjacent days for two CSV rows", async () => {
    findMany.mockResolvedValue([
      event({ id: "a" }),
      event({
        id: "b",
        dedupeKey: "letterboxd_csv:watch:film:2020:2024-01-02",
        watchedAt: new Date("2024-01-02T12:00:00.000Z"),
      }),
    ]);
    await service.repairLetterboxdDuplicates("u1");
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("does not pair scrape and CSV rows two days apart", async () => {
    findMany.mockResolvedValue([
      event({ id: "a", source: "letterboxd" }),
      event({
        id: "b",
        dedupeKey: "letterboxd_csv:watch:film:2020:2024-01-03",
        watchedAt: new Date("2024-01-03T12:00:00.000Z"),
      }),
    ]);
    await service.repairLetterboxdDuplicates("u1");
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("is a no-op on a second pass once rows are canonical", async () => {
    findMany.mockResolvedValue([
      event({ id: "a", rating: 3 }),
      event({
        id: "b",
        dedupeKey: "letterboxd_csv:watch:other:2020:2024-01-01",
        name: "Other",
      }),
    ]);
    const stats = await service.repairLetterboxdDuplicates("u1");
    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(stats).toMatchObject({ merged: 0, migrated: 0, alreadyCanonical: 2 });
  });
});
