import { beforeEach, describe, expect, it, vi } from "vitest";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

type Row = {
  id: string;
  userId: string;
  titleId: string;
  watchedAt: Date;
  dedupeKey: string;
  rating: number | null;
  source: string;
  createdAt: Date;
  rawPayload: string | null;
  title: { name: string; year: number | null };
};

function row(id: string, source: string, date: string, over: Partial<Row> = {}): Row {
  const year = over.title?.year ?? 2020;
  return {
    id,
    userId: "u1",
    titleId: "t1",
    watchedAt: new Date(`${date}T12:00:00.000Z`),
    dedupeKey: `letterboxd_csv:watch:film:${year}:${date}`,
    rating: null,
    source,
    createdAt: new Date("2024-06-01T00:00:00.000Z"),
    rawPayload: null,
    title: { name: "Film", year: 2020 },
    ...over,
  };
}

const scrape = (id: string, date: string, over: Partial<Row> = {}) =>
  row(id, "letterboxd", date, over);
const csv = (id: string, date: string, over: Partial<Row> = {}) =>
  row(id, "letterboxd_csv", date, over);

describe("repairLetterboxdDuplicates adjacent-day merges", () => {
  const findMany = vi.fn();
  const deleteMany = vi.fn();
  const findUnique = vi.fn();
  const update = vi.fn();
  const rebuild = vi.fn();
  let service: LetterboxdService;

  const deletedIds = () =>
    deleteMany.mock.calls.flatMap(([arg]) => arg.where.id.in as string[]);

  const repair = async (rows: Row[]) => {
    findMany.mockResolvedValueOnce(rows);
    return service.repairLetterboxdDuplicates("u1");
  };

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
      {} as EnrichmentService,
      {} as TmdbService,
      {} as UsersService,
    );
  });

  it("merges an isolated drifted scrape row into its CSV row", async () => {
    const result = await repair([
      scrape("s", "2024-01-01", { rawPayload: JSON.stringify({ day: "02" }) }),
      csv("c", "2024-01-02"),
    ]);
    expect(deletedIds()).toEqual(["s"]);
    expect(result.merged).toBe(1);
  });

  it("merges an isolated pair with no scrape payload", async () => {
    await repair([scrape("s", "2024-01-01"), csv("c", "2024-01-02")]);
    expect(deletedIds()).toEqual(["s"]);
  });

  it("merges when the payload has no usable day", async () => {
    for (const rawPayload of ["not json", "null", '{"day":null}', '{"day":"x"}']) {
      deleteMany.mockClear();
      await repair([
        scrape("s", "2024-01-01", { rawPayload }),
        csv("c", "2024-01-02"),
      ]);
      expect(deletedIds()).toEqual(["s"]);
    }
  });

  it("keeps both when the scraped day confirms the scrape date", async () => {
    const result = await repair([
      scrape("s", "2024-01-01", { rawPayload: JSON.stringify({ day: "01" }) }),
      csv("c", "2024-01-02"),
    ]);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(result.merged).toBe(0);
  });

  it("keeps both when the scraped day matches neither date", async () => {
    await repair([
      scrape("s", "2024-01-01", { rawPayload: JSON.stringify({ day: "15" }) }),
      csv("c", "2024-01-02"),
    ]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("compares the scraped day across a month boundary", async () => {
    await repair([
      scrape("s", "2024-01-31", { rawPayload: JSON.stringify({ day: "1" }) }),
      csv("c", "2024-02-01"),
    ]);
    expect(deletedIds()).toEqual(["s"]);
  });

  it("keeps both when the title years differ", async () => {
    await repair([
      scrape("s", "2024-01-01", { title: { name: "Film", year: 1982 } }),
      csv("c", "2024-01-02", { title: { name: "Film", year: 2011 } }),
    ]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("merges when one title year is unknown", async () => {
    await repair([
      scrape("s", "2024-01-01", { title: { name: "Film", year: null } }),
      csv("c", "2024-01-02"),
    ]);
    expect(deletedIds()).toEqual(["s"]);
  });

  it("keeps both when both rows are rated differently", async () => {
    await repair([
      scrape("s", "2024-01-01", { rating: 3 }),
      csv("c", "2024-01-02", { rating: 5 }),
    ]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("merges when both rows share a rating", async () => {
    await repair([
      scrape("s", "2024-01-01", { rating: 4 }),
      csv("c", "2024-01-02", { rating: 4 }),
    ]);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it("keeps all rows of a three-day chain", async () => {
    await repair([
      csv("c1", "2024-01-01"),
      scrape("s", "2024-01-02"),
      csv("c2", "2024-01-03"),
    ]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("does not delete adjacent rows when a same-day row exists", async () => {
    await repair([
      scrape("s1", "2024-01-01"),
      scrape("s2", "2024-01-01", {
        dedupeKey: "letterboxd_csv:watch:film:2021:2024-01-01",
      }),
      csv("c", "2024-01-02"),
    ]);
    expect(deletedIds()).not.toContain("c");
  });

  it("applies every isolated pair in one title bucket", async () => {
    const result = await repair([
      scrape("s1", "2024-01-01"),
      csv("c1", "2024-01-02"),
      scrape("s2", "2024-03-10"),
      csv("c2", "2024-03-11"),
    ]);
    expect(deletedIds().sort()).toEqual(["s1", "s2"]);
    expect(result.merged).toBe(2);
  });

  it("does not merge a pair from different users", async () => {
    await repair([
      scrape("s", "2024-01-01"),
      csv("c", "2024-01-02", { userId: "u2" }),
    ]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("does not merge rows two days apart", async () => {
    await repair([scrape("s", "2024-01-01"), csv("c", "2024-01-03")]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  describe("batched loading", () => {
    const fullPage = (prefix: string) =>
      Array.from({ length: 1000 }, (_, i) =>
        csv(`${prefix}${i}`, "2024-01-01", {
          dedupeKey: `letterboxd_csv:watch:film${prefix}${i}:2020:2024-01-01`,
          title: { name: `Film ${prefix}${i}`, year: 2020 },
        }),
      );

    it("loads the first page with a limit and a stable order", async () => {
      await repair([]);
      const args = findMany.mock.calls[0][0];
      expect(args.take).toBe(1000);
      expect(args.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
      expect(args.cursor).toBeUndefined();
      expect(findMany).toHaveBeenCalledTimes(1);
    });

    it("pages by cursor until a short page", async () => {
      findMany
        .mockResolvedValueOnce(fullPage("a"))
        .mockResolvedValueOnce(fullPage("b"))
        .mockResolvedValueOnce([csv("z", "2024-05-05")]);
      const result = await service.repairLetterboxdDuplicates("u1");
      expect(findMany).toHaveBeenCalledTimes(3);
      expect(findMany.mock.calls[1][0]).toMatchObject({
        cursor: { id: "a999" },
        skip: 1,
      });
      expect(findMany.mock.calls[2][0]).toMatchObject({
        cursor: { id: "b999" },
        skip: 1,
      });
      expect(result.scanned).toBe(2001);
    });

    it("merges a pair split across pages", async () => {
      const first = fullPage("a");
      first[999] = scrape("s", "2024-01-01");
      findMany
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce([csv("c", "2024-01-02")]);
      await service.repairLetterboxdDuplicates("u1");
      expect(deletedIds()).toEqual(["s"]);
    });

    it("stops after an exactly full final page", async () => {
      findMany.mockResolvedValueOnce(fullPage("a")).mockResolvedValueOnce([]);
      const result = await service.repairLetterboxdDuplicates("u1");
      expect(findMany).toHaveBeenCalledTimes(2);
      expect(result.scanned).toBe(1000);
    });
  });
});
