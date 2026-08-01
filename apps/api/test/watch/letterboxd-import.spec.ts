import { beforeEach, describe, expect, it, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import {
  letterboxdRepairGroupKey,
  letterboxdWatchDedupeKey,
  letterboxdWatchDedupeKeyFromTitle,
  normalizeLetterboxdName,
  parseLegacyLetterboxdDedupeKey,
  watchedAtDayUtc,
} from "../../src/watch/imports/letterboxd-keys";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

function makeZip(files: Record<string, string>): Buffer {
  const encoded: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(files)) {
    encoded[name] = strToU8(text);
  }
  return Buffer.from(zipSync(encoded));
}

const diary =
  "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n" +
  "2024-01-02,Test Film,2020,https://boxd.it/x,4,, ,2024-01-01\n";
const ratings =
  "Date,Name,Year,Letterboxd URI,Rating\n2024-01-02,Test Film,2020,https://boxd.it/x,4\n";
const watched =
  "Date,Name,Year,Letterboxd URI\n2024-01-01,Test Film,2020,https://boxd.it/x\n";
const watchedOnly =
  "Date,Name,Year,Letterboxd URI\n2024-01-02,Test Film,2020,https://boxd.it/x\n";

describe("letterboxd keys", () => {
  it("normalizes names for dedupe keys", () => {
    expect(normalizeLetterboxdName("  The Matrix  ")).toBe("the-matrix");
  });

  it("builds unified watch dedupe keys with year", () => {
    expect(letterboxdWatchDedupeKey("Test Film", 2020, "2024-01-01")).toBe(
      "letterboxd_csv:watch:test-film:2020:2024-01-01",
    );
  });

  it("omits year segment when missing", () => {
    expect(letterboxdWatchDedupeKey("Test Film", null, "2024-01-01")).toBe(
      "letterboxd_csv:watch:test-film::2024-01-01",
    );
  });

  it("derives dedupe key from watchedAt date", () => {
    const at = watchedAtDayUtc("2024-01-01");
    expect(at).not.toBeNull();
    expect(
      letterboxdWatchDedupeKeyFromTitle("Test Film", 2020, at!),
    ).toBe("letterboxd_csv:watch:test-film:2020:2024-01-01");
  });

  it("parses legacy diary and watched dedupe keys", () => {
    expect(
      parseLegacyLetterboxdDedupeKey(
        "letterboxd_csv:diary:test-film:2024-01-01",
      ),
    ).toEqual({
      kind: "diary",
      nameNorm: "test-film",
      dateStr: "2024-01-01",
    });
  });

  it("groups legacy and canonical keys by film and day", () => {
    const at = watchedAtDayUtc("2024-01-01")!;
    const legacy = letterboxdRepairGroupKey(
      "u1",
      "letterboxd_csv:diary:test-film:2024-01-01",
      "Test Film",
      at,
    );
    const canonical = letterboxdRepairGroupKey(
      "u1",
      "letterboxd_csv:watch:test-film:2020:2024-01-01",
      "Test Film",
      at,
    );
    expect(legacy).toBe(canonical);
  });
});

describe("LetterboxdService import merge", () => {
  const recordWatch = vi.fn();
  const upsertListState = vi.fn();
  const upsertTitle = vi.fn();
  const enqueueTitle = vi.fn();
  const repairLetterboxdDuplicates = vi.fn();
  const importJobFindFirst = vi.fn();
  const importJobCreate = vi.fn();
  const importJobUpdate = vi.fn();
  const watchEventUpdateMany = vi.fn();
  const watchEventFindFirst = vi.fn();
  const watchEventUpdate = vi.fn();
  const resolveUser = vi.fn();

  let service: LetterboxdService;

  beforeEach(() => {
    recordWatch.mockReset().mockResolvedValue({ id: "e1" });
    upsertListState.mockReset().mockResolvedValue({ id: "ls1" });
    upsertTitle.mockReset().mockResolvedValue({ id: "t1" });
    enqueueTitle.mockReset();
    repairLetterboxdDuplicates.mockReset().mockResolvedValue({
      scanned: 0,
      groups: 0,
      legacyKeys: 0,
      alreadyCanonical: 0,
      duplicateGroups: 0,
      merged: 0,
      migrated: 0,
    });
    importJobFindFirst.mockReset().mockResolvedValue(null);
    importJobCreate.mockReset().mockResolvedValue({ id: "job1" });
    importJobUpdate.mockReset().mockResolvedValue({});
    watchEventUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    watchEventFindFirst.mockReset().mockResolvedValue(null);
    watchEventUpdate.mockReset().mockResolvedValue({});
    resolveUser.mockReset().mockResolvedValue({ id: "u1" });

    const prisma = {
      importJob: {
        findFirst: importJobFindFirst,
        create: importJobCreate,
        update: importJobUpdate,
      },
      watchEvent: {
        updateMany: watchEventUpdateMany,
        findFirst: watchEventFindFirst,
        update: watchEventUpdate,
      },
    } as unknown as PrismaService;

    const catalog = {
      recordWatch,
      upsertListState,
      upsertTitle,
      rebuildWatchHourBuckets: vi.fn(),
    } as unknown as CatalogService;

    const enrichment = { enqueueTitle } as unknown as EnrichmentService;
    const tmdb = { configured: () => false } as unknown as TmdbService;
    const users = { resolveUser } as unknown as UsersService;

    service = new LetterboxdService(
      prisma,
      catalog,
      enrichment,
      tmdb,
      users,
    );
    service.repairLetterboxdDuplicates = repairLetterboxdDuplicates;
  });

  it("merges diary and watched rows into one recordWatch call", async () => {
    const buf = makeZip({
      "export/diary.csv": diary,
      "export/ratings.csv": ratings,
      "export/watched.csv": watched,
    });

    const result = await service.importUpload({
      buffer: buf,
      fileName: "letterboxd.zip",
      userId: "u1",
    });

    expect(result.ok).toBe(true);
    expect(result.files).toEqual(expect.arrayContaining(["diary", "ratings"]));
    expect(result.files).not.toContain("watched");
    expect(repairLetterboxdDuplicates).toHaveBeenCalledWith("u1");
    expect(recordWatch).toHaveBeenCalledTimes(1);
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: "letterboxd_csv:watch:test-film:2020:2024-01-01",
        rating: 4,
        source: "letterboxd_csv",
      }),
    );
    expect(upsertListState).toHaveBeenCalledWith(
      expect.objectContaining({
        listType: "rating",
        rating: 4,
      }),
    );
  });

  it("imports diary-only rows", async () => {
    const buf = makeZip({ "export/diary.csv": diary });

    await service.importUpload({
      buffer: buf,
      fileName: "letterboxd.zip",
      include: ["diary"],
      userId: "u1",
    });

    expect(recordWatch).toHaveBeenCalledTimes(1);
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: "letterboxd_csv:watch:test-film:2020:2024-01-01",
      }),
    );
  });

  it("uses diary Watched Date when watched.csv has a different log date", async () => {
    const diaryRow =
      "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n" +
      "2026-04-19,Project Hail Mary,2026,https://boxd.it/e1DNED,5,,,2026-04-18\n";
    const watchedRow =
      "Date,Name,Year,Letterboxd URI\n" +
      "2026-04-19,Project Hail Mary,2026,https://boxd.it/pEeQ\n";
    const buf = makeZip({
      "export/diary.csv": diaryRow,
      "export/watched.csv": watchedRow,
      "export/ratings.csv":
        "Date,Name,Year,Letterboxd URI,Rating\n" +
        "2026-04-19,Project Hail Mary,2026,https://boxd.it/pEeQ,5\n",
    });

    const result = await service.importUpload({
      buffer: buf,
      fileName: "letterboxd.zip",
      userId: "u1",
    });

    expect(result.ok).toBe(true);
    expect(recordWatch).toHaveBeenCalledTimes(1);
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey:
          "letterboxd_csv:watch:project-hail-mary:2026:2026-04-18",
        watchedAt: watchedAtDayUtc("2026-04-18"),
        rating: 5,
      }),
    );
  });

  it("merges ratings.csv stars onto diary watches without a diary rating", async () => {
    const diaryNoRating =
      "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n" +
      "2026-04-19,Project Hail Mary,2026,https://boxd.it/e1DNED,,,,2026-04-18\n";
    const ratingsRow =
      "Date,Name,Year,Letterboxd URI,Rating\n" +
      "2026-04-19,Project Hail Mary,2026,https://boxd.it/pEeQ,4.5\n";
    const buf = makeZip({
      "export/diary.csv": diaryNoRating,
      "export/ratings.csv": ratingsRow,
    });

    await service.importUpload({
      buffer: buf,
      fileName: "letterboxd.zip",
      userId: "u1",
    });

    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 4.5,
      }),
    );
  });

  it("imports watched-only rows", async () => {
    const buf = makeZip({ "export/watched.csv": watchedOnly });

    await service.importUpload({
      buffer: buf,
      fileName: "letterboxd.zip",
      include: ["watched"],
      userId: "u1",
    });

    expect(recordWatch).toHaveBeenCalledTimes(1);
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: "letterboxd_csv:watch:test-film:2020:2024-01-02",
      }),
    );
  });
});

describe("LetterboxdService.repairLetterboxdDuplicates", () => {
  const watchEventFindMany = vi.fn();
  const watchEventDeleteMany = vi.fn();
  const watchEventDelete = vi.fn();
  const watchEventFindUnique = vi.fn();
  const watchEventUpdate = vi.fn();
  const rebuildWatchHourBuckets = vi.fn();

  let service: LetterboxdService;

  beforeEach(() => {
    watchEventFindMany.mockReset();
    watchEventDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    watchEventDelete.mockReset().mockResolvedValue({});
    watchEventFindUnique.mockReset().mockResolvedValue(null);
    watchEventUpdate.mockReset().mockResolvedValue({});
    rebuildWatchHourBuckets.mockReset().mockResolvedValue(undefined);

    const prisma = {
      watchEvent: {
        findMany: watchEventFindMany,
        deleteMany: watchEventDeleteMany,
        delete: watchEventDelete,
        findUnique: watchEventFindUnique,
        update: watchEventUpdate,
      },
      appConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    const catalog = {
      rebuildWatchHourBuckets,
    } as unknown as CatalogService;

    service = new LetterboxdService(
      prisma,
      catalog,
      { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
      { configured: () => false } as unknown as TmdbService,
      { resolveUser: vi.fn() } as unknown as UsersService,
    );
  });

  it("merges duplicate diary and watched events and migrates dedupe key", async () => {
    const watchedAt = watchedAtDayUtc("2024-01-01")!;
    watchEventFindMany.mockResolvedValue([
      {
        id: "e-diary",
        userId: "u1",
        titleId: "t1",
        watchedAt,
        dedupeKey: "letterboxd_csv:diary:test-film:2024-01-01",
        rating: 4,
        createdAt: new Date("2024-01-03"),
        title: { name: "Test Film", year: 2020 },
      },
      {
        id: "e-watched",
        userId: "u1",
        titleId: "t1",
        watchedAt,
        dedupeKey: "letterboxd_csv:watched:test-film:2024-01-01",
        rating: null,
        createdAt: new Date("2024-01-04"),
        title: { name: "Test Film", year: 2020 },
      },
    ]);

    const result = await service.repairLetterboxdDuplicates("u1");

    expect(result.merged).toBe(1);
    expect(result.migrated).toBe(0);
    expect(watchEventDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["e-watched"] } },
    });
    expect(watchEventUpdate).toHaveBeenCalledWith({
      where: { id: "e-diary" },
      data: {
        dedupeKey: "letterboxd_csv:watch:test-film:2020:2024-01-01",
        rating: 4,
        watchedAt: watchedAtDayUtc("2024-01-01"),
      },
    });
    expect(rebuildWatchHourBuckets).toHaveBeenCalledWith("u1");
  });

  it("merges legacy diary and canonical watch rows with different titleIds", async () => {
    const watchedAt = watchedAtDayUtc("2024-01-01")!;
    watchEventFindMany.mockResolvedValue([
      {
        id: "e-diary",
        userId: "u1",
        titleId: "t-null-year",
        watchedAt,
        dedupeKey: "letterboxd_csv:diary:test-film:2024-01-01",
        rating: 4,
        createdAt: new Date("2024-01-03"),
        title: { name: "Test Film", year: null },
      },
      {
        id: "e-watch",
        userId: "u1",
        titleId: "t-2020",
        watchedAt,
        dedupeKey: "letterboxd_csv:watch:test-film:2020:2024-01-01",
        rating: null,
        createdAt: new Date("2024-01-04"),
        title: { name: "Test Film", year: 2020 },
      },
    ]);

    const result = await service.repairLetterboxdDuplicates("u1");

    expect(result.merged).toBe(1);
    expect(watchEventDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["e-watch"] } },
    });
    expect(watchEventUpdate).toHaveBeenCalledWith({
      where: { id: "e-diary" },
      data: {
        dedupeKey: "letterboxd_csv:watch:test-film:2020:2024-01-01",
        rating: 4,
        watchedAt: watchedAtDayUtc("2024-01-01"),
      },
    });
  });

  it("merges scrape and CSV events with different year segments in dedupe key", async () => {
    const watchedAt = watchedAtDayUtc("2024-07-22")!;
    watchEventFindMany.mockResolvedValue([
      {
        id: "e-scrape",
        userId: "u1",
        titleId: "t-scrape",
        watchedAt,
        dedupeKey: "letterboxd_csv:watch:midsommar::2024-07-22",
        rating: 4,
        createdAt: new Date("2024-07-23"),
        title: { name: "Midsommar", year: null },
      },
      {
        id: "e-csv",
        userId: "u1",
        titleId: "t-csv",
        watchedAt,
        dedupeKey: "letterboxd_csv:watch:midsommar:2019:2024-07-22",
        rating: 4,
        createdAt: new Date("2024-07-24"),
        title: { name: "Midsommar", year: 2019 },
      },
    ]);

    const result = await service.repairLetterboxdDuplicates("u1");

    expect(result.merged).toBe(1);
    expect(watchEventDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["e-csv"] } },
    });
    expect(watchEventUpdate).toHaveBeenCalledWith({
      where: { id: "e-scrape" },
      data: {
        dedupeKey: "letterboxd_csv:watch:midsommar:2019:2024-07-22",
        rating: 4,
        watchedAt,
      },
    });
  });
});
