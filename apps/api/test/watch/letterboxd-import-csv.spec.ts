import { beforeEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("LetterboxdService CSV handling", () => {
  const recordWatch = vi.fn();
  const upsertListState = vi.fn();
  const upsertTitle = vi.fn();
  const enqueueTitle = vi.fn();
  const updateMany = vi.fn();
  const watchFindFirst = vi.fn();
  const watchUpdate = vi.fn();
  const searchMovie = vi.fn();
  let tmdbConfigured = false;
  let service: LetterboxdService;

  const run = (text: string, fileName = "diary.csv") =>
    service.importUpload({
      buffer: Buffer.from(text, "utf8"),
      fileName,
      userId: "u1",
    });

  beforeEach(() => {
    tmdbConfigured = false;
    recordWatch.mockReset().mockResolvedValue({});
    upsertListState.mockReset().mockResolvedValue({});
    upsertTitle.mockReset().mockResolvedValue({ id: "t1" });
    enqueueTitle.mockReset();
    updateMany.mockReset().mockResolvedValue({ count: 0 });
    watchFindFirst.mockReset().mockResolvedValue(null);
    watchUpdate.mockReset().mockResolvedValue({});
    searchMovie.mockReset().mockResolvedValue(null);

    service = new LetterboxdService(
      {
        importJob: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "job1" }),
          update: vi.fn().mockResolvedValue({}),
        },
        watchEvent: {
          updateMany,
          findFirst: watchFindFirst,
          update: watchUpdate,
        },
      } as unknown as PrismaService,
      { recordWatch, upsertListState, upsertTitle } as unknown as CatalogService,
      { enqueueTitle } as unknown as EnrichmentService,
      {
        configured: () => tmdbConfigured,
        searchMovie,
      } as unknown as TmdbService,
      { resolveUser: vi.fn().mockResolvedValue({ id: "u1" }) } as unknown as UsersService,
    );
    service.repairLetterboxdDuplicates = vi.fn().mockResolvedValue({});
  });

  describe("parsing", () => {
    const names = () => upsertTitle.mock.calls.map((c) => c[0].name);

    it("handles quoted commas", async () => {
      await run('Name,Watched Date\n"Good, Bad",2024-01-01\n');
      expect(names()).toEqual(["Good, Bad"]);
    });

    it("handles escaped quotes", async () => {
      await run('Name,Watched Date\n"The ""Best"" Film",2024-01-01\n');
      expect(names()).toEqual(['The "Best" Film']);
    });

    it("keeps newlines inside quoted cells", async () => {
      await run('Name,Watched Date\n"Two\nLines",2024-01-01\n');
      expect(names()).toEqual(["Two\nLines"]);
    });

    it("handles CRLF and bare CR line endings", async () => {
      await run("Name,Watched Date\r\nA,2024-01-01\rB,2024-01-02\r\n");
      expect(names()).toEqual(["A", "B"]);
    });

    it("strips a UTF-8 BOM from the header", async () => {
      await run("﻿Name,Watched Date\nA,2024-01-01\n");
      expect(names()).toEqual(["A"]);
    });

    it("parses a final row without a trailing newline", async () => {
      await run("Name,Watched Date\nA,2024-01-01");
      expect(names()).toEqual(["A"]);
    });

    it("ignores blank lines", async () => {
      const result = await run(
        "Name,Watched Date\n\n , \nA,2024-01-01\n\n",
      );
      expect(names()).toEqual(["A"]);
      expect(result.skipped).toBe(0);
    });

    it("matches headers case-insensitively with padding", async () => {
      await run(" NAME , WATCHED DATE ,YEAR\nA,2024-01-01,2020\n");
      expect(recordWatch.mock.calls[0][0].dedupeKey).toBe(
        "letterboxd_csv:watch:a:2020:2024-01-01",
      );
    });

    it("accepts a Title column in place of Name", async () => {
      await run("Title,Watched Date\nA,2024-01-01\n");
      expect(names()).toEqual(["A"]);
    });

    it("preserves unicode titles", async () => {
      await run("Name,Watched Date\n千と千尋,2024-01-01\n");
      expect(names()).toEqual(["千と千尋"]);
    });

    it("treats spreadsheet formula text as a literal title", async () => {
      await run('Name,Watched Date\n"=cmd|calc",2024-01-01\n');
      expect(names()).toEqual(["=cmd|calc"]);
    });
  });

  describe("watch rows", () => {
    it.each([
      ["blank name", " ,2024-01-01"],
      ["missing date", "A,"],
      ["short row", "A"],
      ["unparseable date", "A,yesterday"],
      ["out of range month", "A,2024-13-01"],
    ])("skips a row with %s", async (_label, row) => {
      const result = await run(`Name,Watched Date\n${row}\nB,2024-01-02\n`);
      expect(result.skipped).toBe(1);
      expect(recordWatch).toHaveBeenCalledTimes(1);
      expect(recordWatch.mock.calls[0][0].dedupeKey).toContain(":b:");
    });

    it("completes with nothing accepted when every row is invalid", async () => {
      const result = await run("Name,Watched Date\nA,nope\nB,nope\n");
      expect(result).toMatchObject({ ok: true, accepted: 0, skipped: 2 });
      expect(recordWatch).not.toHaveBeenCalled();
    });

    it("falls back to Date when a diary has no Watched Date", async () => {
      await run("Name,Date\nA,2024-05-05\n");
      expect(recordWatch.mock.calls[0][0].dedupeKey).toContain("2024-05-05");
    });

    it("prefers Date over Watched Date for watched.csv", async () => {
      await run(
        "Name,Date,Watched Date\nA,2024-05-05,2024-06-06\n",
        "watched.csv",
      );
      expect(recordWatch.mock.calls[0][0].dedupeKey).toContain("2024-05-05");
    });

    it("skips watched rows when the file has no date column", async () => {
      const result = await run("Name,Year\nA,2020\n", "watched.csv");
      expect(result).toMatchObject({ ok: true, accepted: 0, skipped: 1 });
    });

    it("nulls non-numeric year and rating", async () => {
      await run("Name,Year,Rating,Watched Date\nA,soon,great,2024-01-01\n");
      expect(upsertTitle.mock.calls[0][0].year).toBeNull();
      expect(recordWatch.mock.calls[0][0]).toMatchObject({
        rating: null,
        dedupeKey: "letterboxd_csv:watch:a::2024-01-01",
      });
      expect(upsertListState).not.toHaveBeenCalled();
    });

    it("writes the full watch record and a rating list state", async () => {
      upsertTitle.mockResolvedValue({ id: "t9" });
      await run("Name,Year,Rating,Watched Date\nA,2020,4.5,2024-01-01\n");
      const at = new Date("2024-01-01T12:00:00.000Z");
      expect(recordWatch).toHaveBeenCalledWith({
        userId: "u1",
        titleId: "t9",
        watchedAt: at,
        source: "letterboxd_csv",
        dedupeKey: "letterboxd_csv:watch:a:2020:2024-01-01",
        action: "import",
        rating: 4.5,
        precision: "day",
      });
      expect(upsertListState).toHaveBeenCalledWith({
        userId: "u1",
        titleId: "t9",
        listType: "rating",
        source: "letterboxd_csv",
        rating: 4.5,
        listedAt: at,
      });
      expect(enqueueTitle).toHaveBeenCalledWith("t9");
    });

    it("dedupes rows that normalize to the same film and day", async () => {
      await run(
        "Name,Year,Watched Date\nThe Film,2020,2024-01-01\n the   film ,2020,2024-01-01\n",
      );
      expect(recordWatch).toHaveBeenCalledTimes(1);
    });

    it("keeps separate watches on different days", async () => {
      await run(
        "Name,Year,Watched Date\nA,2020,2024-01-01\nA,2020,2024-02-01\n",
      );
      expect(recordWatch).toHaveBeenCalledTimes(2);
    });

    it("is idempotent across re-imports through stable dedupe keys", async () => {
      const csv = "Name,Year,Watched Date\nA,2020,2024-01-01\n";
      await run(csv);
      await run(csv);
      const keys = recordWatch.mock.calls.map((c) => c[0].dedupeKey);
      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe(keys[1]);
    });

    it("ignores watched.csv when a diary is in the same archive", async () => {
      const buffer = Buffer.from(
        zipSync({
          "diary.csv": strToU8("Name,Watched Date\nA,2024-01-01\n"),
          "watched.csv": strToU8("Name,Date\nB,2024-02-02\n"),
        }),
      );
      const result = await service.importUpload({
        buffer,
        fileName: "export.zip",
        userId: "u1",
      });
      expect(result.files).toEqual(["diary"]);
      expect(upsertTitle.mock.calls.map((c) => c[0].name)).toEqual(["A"]);
    });
  });

  describe("ratings.csv in an archive", () => {
    const archive = (ratings: string) =>
      service.importUpload({
        buffer: Buffer.from(
          zipSync({
            "diary.csv": strToU8(
              "Name,Year,Watched Date\nA,2020,2024-01-01\n",
            ),
            "ratings.csv": strToU8(ratings),
          }),
        ),
        fileName: "export.zip",
        userId: "u1",
      });

    it("does not rate a film when the year differs", async () => {
      await archive("Name,Year,Rating\nA,1999,5\n");
      expect(recordWatch.mock.calls[0][0].rating).toBeNull();
    });

    it("ignores a ratings file lacking a rating column for the merge", async () => {
      const result = await archive("Name,Year\nA,2020\n");
      expect(recordWatch.mock.calls[0][0].rating).toBeNull();
      expect(result.warnings).toEqual([
        "ratings.csv: ratings.csv must include a Rating column",
      ]);
      expect(result.files).toEqual(["diary"]);
    });

    it("ignores blank rating cells for the merge", async () => {
      await archive("Name,Year,Rating\nA,2020,\n");
      expect(recordWatch.mock.calls[0][0].rating).toBeNull();
    });
  });

  describe("bare ratings.csv", () => {
    const at = new Date("2024-03-03T12:00:00.000Z");

    it("patches the watch on the rated day for the caller only", async () => {
      updateMany.mockResolvedValue({ count: 1 });
      await run(
        "Date,Name,Year,Rating\n2024-03-03,A,2020,3.5\n",
        "ratings.csv",
      );
      expect(upsertListState).toHaveBeenCalledWith({
        userId: "u1",
        titleId: "t1",
        listType: "rating",
        source: "letterboxd_csv",
        rating: 3.5,
        listedAt: at,
      });
      expect(updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", titleId: "t1", watchedAt: at, rating: null },
        data: { rating: 3.5 },
      });
      expect(watchFindFirst).not.toHaveBeenCalled();
      expect(recordWatch).not.toHaveBeenCalled();
    });

    it("falls back to the latest unrated watch", async () => {
      watchFindFirst.mockResolvedValue({ id: "w7" });
      await run("Date,Name,Rating\n2024-03-03,A,2\n", "ratings.csv");
      expect(watchFindFirst).toHaveBeenCalledWith({
        where: { userId: "u1", titleId: "t1", rating: null },
        orderBy: { watchedAt: "desc" },
      });
      expect(watchUpdate).toHaveBeenCalledWith({
        where: { id: "w7" },
        data: { rating: 2 },
      });
    });

    it("skips the date match when the row has no date", async () => {
      await run("Name,Rating\nA,2\n", "ratings.csv");
      expect(updateMany).not.toHaveBeenCalled();
      expect(watchFindFirst).toHaveBeenCalled();
      expect(upsertListState.mock.calls[0][0].listedAt).toBeNull();
    });

    it("writes nothing when there is no watch to rate", async () => {
      const result = await run("Name,Rating\nA,2\n", "ratings.csv");
      expect(watchUpdate).not.toHaveBeenCalled();
      expect(result.accepted).toBe(1);
    });

    it("skips rows without a usable rating", async () => {
      const result = await run(
        "Name,Rating\nA,\nB,great\n,4\n",
        "ratings.csv",
      );
      expect(result).toMatchObject({ accepted: 0, skipped: 3 });
      expect(upsertListState).not.toHaveBeenCalled();
    });
  });

  describe("bare watchlist.csv", () => {
    it("writes a watchlist state with no watch event", async () => {
      await run("Date,Name,Year\n2024-03-03,A,2020\n", "watchlist.csv");
      expect(upsertListState).toHaveBeenCalledWith({
        userId: "u1",
        titleId: "t1",
        listType: "watchlist",
        source: "letterboxd_csv",
        listedAt: new Date("2024-03-03T12:00:00.000Z"),
      });
      expect(recordWatch).not.toHaveBeenCalled();
      expect(enqueueTitle).toHaveBeenCalledWith("t1");
    });

    it.each(["", "garbage"])("nulls listedAt for date %j", async (date) => {
      await run(`Date,Name\n${date},A\n`, "watchlist.csv");
      expect(upsertListState.mock.calls[0][0].listedAt).toBeNull();
    });

    it("skips a row with no name", async () => {
      const result = await run("Date,Name\n2024-03-03, \n", "watchlist.csv");
      expect(result).toMatchObject({ accepted: 0, skipped: 1 });
      expect(upsertTitle).not.toHaveBeenCalled();
    });
  });

  describe("TMDB lookup", () => {
    it("does not search when TMDB is unconfigured", async () => {
      await run("Name,Watched Date\nA,2024-01-01\n");
      expect(searchMovie).not.toHaveBeenCalled();
      expect(upsertTitle.mock.calls[0][0].tmdbId).toBeNull();
    });

    it("passes a found id for watch rows", async () => {
      tmdbConfigured = true;
      searchMovie.mockResolvedValue({ id: 603 });
      await run("Name,Year,Watched Date\nA,1999,2024-01-01\n");
      expect(searchMovie).toHaveBeenCalledWith("A", 1999);
      expect(upsertTitle).toHaveBeenCalledWith({
        type: "movie",
        name: "A",
        year: 1999,
        tmdbId: 603,
      });
    });

    it("passes a found id for list rows", async () => {
      tmdbConfigured = true;
      searchMovie.mockResolvedValue({ id: 603 });
      await run("Name,Year\nA,1999\n", "watchlist.csv");
      expect(upsertTitle.mock.calls[0][0].tmdbId).toBe(603);
    });

    it.each([
      ["diary.csv", "Name,Watched Date\nA,2024-01-01\n", recordWatch],
      ["watchlist.csv", "Name\nA\n", upsertListState],
    ])("tolerates a TMDB failure while importing %s", async (file, text, writer) => {
      tmdbConfigured = true;
      searchMovie.mockRejectedValue(new Error("tmdb 500"));
      await run(text, file);
      expect(upsertTitle.mock.calls[0][0].tmdbId).toBeNull();
      expect(writer).toHaveBeenCalledTimes(1);
    });

    it("nulls the id when TMDB finds nothing", async () => {
      tmdbConfigured = true;
      await run("Name,Watched Date\nA,2024-01-01\n");
      expect(upsertTitle.mock.calls[0][0].tmdbId).toBeNull();
    });
  });
});
