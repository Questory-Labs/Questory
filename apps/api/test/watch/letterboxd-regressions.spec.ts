import { beforeEach, describe, expect, it, vi } from "vitest";
import { watchedAtDayUtc } from "../../src/watch/imports/letterboxd-keys";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import { LetterboxdConnectService } from "../../src/watch/letterboxd/letterboxd-connect.service";
import {
  letterboxdDateFromParts,
  normalizeLetterboxdScrapeRows,
  yearFromFilmPath,
} from "../../src/watch/letterboxd/letterboxd-row-parse";
import { LetterboxdScrapeSyncService } from "../../src/watch/letterboxd/letterboxd-scrape-sync.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("malformed film hrefs", () => {
  it.each(["http://[bad", "https://", "http://exa mple.com/film/x-2020/"])(
    "returns null for %s",
    (href) => {
      expect(yearFromFilmPath(href)).toBeNull();
    },
  );

  it("still reads a year from a valid absolute href", () => {
    expect(yearFromFilmPath("https://letterboxd.com/film/x-2020/")).toBe(2020);
  });

  it("does not abort a scrape page", () => {
    const [row] = normalizeLetterboxdScrapeRows([
      { title: "A", filmHref: "http://[bad", date: "2024-01-01" },
    ]);
    expect(row).toMatchObject({ title: "A", year: null, date: "2024-01-01" });
  });
});

describe("impossible calendar dates", () => {
  it.each(["2024-02-30", "2023-02-29", "2024-04-31", "2024-13-01", "2024-1-5"])(
    "watchedAtDayUtc rejects %s",
    (date) => {
      expect(watchedAtDayUtc(date)).toBeNull();
    },
  );

  it("watchedAtDayUtc accepts a leap day", () => {
    expect(watchedAtDayUtc("2024-02-29")?.toISOString()).toBe(
      "2024-02-29T12:00:00.000Z",
    );
  });

  it("rejects an impossible day from scrape parts", () => {
    expect(letterboxdDateFromParts("Feb", "31", "2024")).toBeNull();
    expect(letterboxdDateFromParts("Feb", "9", "2024")).toBe("2024-02-09");
  });

  it("falls back to the href date when the parts are impossible", () => {
    const [row] = normalizeLetterboxdScrapeRows([
      { month: "Feb", yearHeader: "2024", day: "31", date: "2024-02-28" },
    ]);
    expect(row.date).toBe("2024-02-28");
  });
});

describe("syncAll isolation", () => {
  const listConnections = vi.fn();
  let service: LetterboxdScrapeSyncService;

  beforeEach(() => {
    listConnections.mockReset();
    service = new LetterboxdScrapeSyncService(
      {} as never,
      { listConnections } as never,
      { getPublishedDefinition: async () => ({ stop: {} }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        isDomainEnabled: async () => true,
        isSourceEnabled: async () => true,
      } as never,
    );
  });

  it("continues after one user fails", async () => {
    listConnections.mockResolvedValue([
      { userId: "u1", externalUserId: "one" },
      { userId: "u2", externalUserId: "two" },
      { userId: "u3", externalUserId: "three" },
    ]);
    const syncUser = vi
      .spyOn(service, "syncUser")
      .mockResolvedValueOnce({ imported: 1, skipped: 2, stoppedEarly: false })
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce({ imported: 3, skipped: 0, stoppedEarly: true });

    await expect(service.syncAll()).resolves.toEqual({
      users: 3,
      imported: 4,
      skipped: 2,
      stopped: 1,
    });
    expect(syncUser).toHaveBeenCalledTimes(3);
  });

  it("counts only connections with a username", async () => {
    listConnections.mockResolvedValue([
      { userId: "u1", externalUserId: "" },
      { userId: "u2", externalUserId: null },
      { userId: "u3", externalUserId: "three" },
    ]);
    vi.spyOn(service, "syncUser").mockResolvedValue({
      imported: 0,
      skipped: 0,
      stoppedEarly: false,
    });
    await expect(service.syncAll()).resolves.toMatchObject({ users: 1 });
  });
});

describe("connect username changes", () => {
  const findUnique = vi.fn();
  const upsert = vi.fn();
  let service: LetterboxdConnectService;

  const updateArg = () => upsert.mock.calls[0][0].update;

  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset().mockResolvedValue({ externalUserId: "next" });
    service = new LetterboxdConnectService({
      sourceConnection: { findUnique, upsert },
    } as unknown as PrismaService);
  });

  it("clears sync state when the username changes", async () => {
    findUnique.mockResolvedValue({ externalUserId: "prev" });
    await service.connect("u1", "next");
    expect(updateArg()).toEqual({
      externalUserId: "next",
      syncCursor: null,
      lastSyncedAt: null,
    });
  });

  it("keeps sync state when the normalized username is unchanged", async () => {
    findUnique.mockResolvedValue({ externalUserId: "next" });
    await service.connect("u1", " @NEXT ");
    expect(updateArg()).toEqual({ externalUserId: "next" });
  });

  it("does not add reset fields for a first connection", async () => {
    findUnique.mockResolvedValue(null);
    await service.connect("u1", "next");
    expect(updateArg()).toEqual({ externalUserId: "next" });
  });
});

describe("CSV import counting and value parsing", () => {
  const findFirst = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const recordWatch = vi.fn();
  const upsertListState = vi.fn();
  const upsertTitle = vi.fn();
  let service: LetterboxdService;

  const importCsv = (text: string, fileName = "diary.csv") =>
    service.importUpload({ buffer: Buffer.from(text), fileName, userId: "u1" });

  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
    create.mockReset().mockResolvedValue({ id: "job1" });
    update.mockReset().mockResolvedValue({});
    recordWatch.mockReset().mockResolvedValue({});
    upsertListState.mockReset().mockResolvedValue({});
    upsertTitle.mockReset().mockResolvedValue({ id: "t1" });
    service = new LetterboxdService(
      {
        importJob: { findFirst, create, update },
        watchEvent: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      } as unknown as PrismaService,
      { recordWatch, upsertListState, upsertTitle } as unknown as CatalogService,
      { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
      { configured: () => false } as unknown as TmdbService,
      { resolveUser: async () => ({ id: "u1" }) } as unknown as UsersService,
    );
    service.repairLetterboxdDuplicates = vi.fn().mockResolvedValue({});
  });

  it("counts a failed write as skipped, not accepted", async () => {
    recordWatch.mockRejectedValueOnce(new Error("db"));
    const result = await importCsv(
      "Name,Year,Watched Date\nA,2020,2024-01-01\nB,2020,2024-01-02\n",
    );
    expect(result).toMatchObject({ ok: true, accepted: 1, skipped: 1 });
  });

  it("counts a duplicate row as skipped", async () => {
    const result = await importCsv(
      "Name,Year,Watched Date\nA,2020,2024-01-01\nA,2020,2024-01-01\n",
    );
    expect(result).toMatchObject({ accepted: 1, skipped: 1 });
    expect(recordWatch).toHaveBeenCalledTimes(1);
  });

  it("accounts for every row in the persisted progress", async () => {
    await importCsv(
      "Name,Year,Watched Date\nA,2020,2024-01-01\nA,2020,2024-01-01\n,2020,2024-01-02\nB,2020,2024-01-03\n",
    );
    expect(update.mock.calls.at(-1)?.[0].data).toMatchObject({
      status: "completed",
      accepted: 2,
      skipped: 2,
    });
  });

  it("fails the job when every watch write fails", async () => {
    recordWatch.mockRejectedValue(new Error("db"));
    await expect(
      importCsv("Name,Year,Watched Date\nA,2020,2024-01-01\n"),
    ).rejects.toThrow("No watches could be saved");
    expect(update.mock.calls.at(-1)?.[0].data).toMatchObject({
      status: "failed",
    });
  });

  it("treats whitespace-only year and rating as missing", async () => {
    await importCsv("Name,Year,Rating,Watched Date\nA,  ,  ,2024-01-01\n");
    expect(upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({ year: null }),
    );
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({ rating: null }),
    );
    expect(upsertListState).not.toHaveBeenCalled();
  });

  it.each(["0", "0.25", "5.5", "10", "-1"])(
    "drops out-of-range rating %s but keeps the watch",
    async (rating) => {
      await importCsv(`Name,Year,Rating,Watched Date\nA,2020,${rating},2024-01-01\n`);
      expect(recordWatch).toHaveBeenCalledWith(
        expect.objectContaining({ rating: null }),
      );
      expect(upsertListState).not.toHaveBeenCalled();
    },
  );

  it.each(["0.5", "3.5", "5"])("keeps in-range rating %s", async (rating) => {
    await importCsv(`Name,Year,Rating,Watched Date\nA,2020,${rating},2024-01-01\n`);
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({ rating: Number(rating) }),
    );
  });

  it("skips an unusable ratings row without creating a title", async () => {
    const result = await importCsv(
      "Date,Name,Year,Rating\n2024-01-01,A,2020,\n2024-01-01,B,2020,9\n2024-01-01,C,2020,  \n",
      "ratings.csv",
    );
    expect(upsertTitle).not.toHaveBeenCalled();
    expect(upsertListState).not.toHaveBeenCalled();
    expect(result).toMatchObject({ accepted: 0, skipped: 3 });
  });

  it("does not let an out-of-range ratings.csv value override a diary rating", async () => {
    const diary = "Name,Year,Rating,Watched Date\nA,2020,4,2024-01-01\n";
    const { strToU8, zipSync } = await import("fflate");
    const buffer = Buffer.from(
      zipSync({
        "diary.csv": strToU8(diary),
        "ratings.csv": strToU8("Name,Year,Rating\nA,2020,9\n"),
      }),
    );
    await service.importUpload({ buffer, fileName: "e.zip", userId: "u1" });
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4 }),
    );
  });
});
