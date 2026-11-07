import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { strToU8, zipSync } from "fflate";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

const DIARY =
  "Name,Year,Rating,Watched Date\nFilm,2020,4,2024-01-01\n";
const WATCHLIST = "Date,Name,Year\n2024-01-02,Queued,2021\n";

function zip(files: Record<string, string>): Buffer {
  const encoded: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(files)) {
    encoded[name] = strToU8(text);
  }
  return Buffer.from(zipSync(encoded));
}

describe("LetterboxdService import lifecycle", () => {
  const findFirst = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const recordWatch = vi.fn();
  const upsertListState = vi.fn();
  const upsertTitle = vi.fn();
  const resolveUser = vi.fn();
  const repair = vi.fn();
  let service: LetterboxdService;

  const finalUpdate = () => update.mock.calls.at(-1)?.[0];

  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
    create.mockReset().mockResolvedValue({ id: "job1" });
    update.mockReset().mockResolvedValue({});
    recordWatch.mockReset().mockResolvedValue({});
    upsertListState.mockReset().mockResolvedValue({});
    upsertTitle.mockReset().mockResolvedValue({ id: "t1" });
    resolveUser.mockReset().mockResolvedValue({ id: "u1" });
    repair.mockReset().mockResolvedValue({});

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
      { resolveUser } as unknown as UsersService,
    );
    service.repairLetterboxdDuplicates = repair;
  });

  describe("preconditions", () => {
    it("rejects when no user resolves and creates no job", async () => {
      resolveUser.mockResolvedValue(null);
      await expect(
        service.importUpload({ buffer: Buffer.from(DIARY) }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(create).not.toHaveBeenCalled();
      expect(repair).not.toHaveBeenCalled();
    });

    it("resolves the caller and scopes all job access to them", async () => {
      await service.importUpload({
        buffer: Buffer.from(DIARY),
        fileName: "diary.csv",
        userId: "session-user",
      });
      expect(resolveUser).toHaveBeenCalledWith("session-user");
      expect(findFirst.mock.calls[0][0].where).toEqual({
        userId: "u1",
        source: "letterboxd_csv",
        status: "running",
      });
      expect(create.mock.calls[0][0].data.userId).toBe("u1");
      expect(repair).toHaveBeenCalledWith("u1");
      expect(recordWatch.mock.calls[0][0].userId).toBe("u1");
    });

    it("refuses a concurrent import and exposes the running job id", async () => {
      findFirst.mockResolvedValue({ id: "running-job" });
      const err = await service
        .importUpload({ buffer: Buffer.from(DIARY) })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        statusCode: 409,
        jobId: "running-job",
      });
      expect(create).not.toHaveBeenCalled();
      expect(repair).not.toHaveBeenCalled();
    });

    it("sanitizes and defaults the stored file name", async () => {
      await service.importUpload({
        buffer: Buffer.from(DIARY),
        fileName: "../a\\diary.csv",
      });
      expect(create.mock.calls[0][0].data.fileName).toBe(".._a_diary.csv");

      create.mockClear();
      await service.importUpload({ buffer: Buffer.from(DIARY) });
      expect(create.mock.calls[0][0].data.fileName).toBe("letterboxd");
    });
  });

  describe("completion", () => {
    it("records totals across every CSV in the archive", async () => {
      const result = await service.importUpload({
        buffer: zip({
          "export/diary.csv":
            "Name,Watched Date\nA,2024-01-01\n\nB,2024-01-02\n",
          "export/watchlist.csv": WATCHLIST,
        }),
        fileName: "export.zip",
      });
      expect(update.mock.calls[0][0]).toEqual({
        where: { id: "job1" },
        data: { total: 3 },
      });
      expect(result).toEqual({
        ok: true,
        jobId: "job1",
        accepted: 3,
        skipped: 0,
        files: ["diary", "watchlist"],
        warnings: undefined,
      });
      expect(finalUpdate().data).toMatchObject({
        status: "completed",
        accepted: 3,
        skipped: 0,
        lastError: null,
        completedAt: expect.any(Date),
      });
    });

    it("reports progress at every fifth list row and at the end", async () => {
      const rows = Array.from({ length: 6 }, (_, i) => `Film ${i},2020`);
      await service.importUpload({
        buffer: Buffer.from(`Name,Year\n${rows.join("\n")}\n`),
        fileName: "watchlist.csv",
      });
      expect(update.mock.calls.map((c) => c[0].data)).toEqual([
        { total: 6 },
        { accepted: 5, skipped: 0 },
        { accepted: 6, skipped: 0 },
        expect.objectContaining({ status: "completed", accepted: 6 }),
      ]);
    });

    it("processes batches large enough to yield the event loop", async () => {
      const rows = Array.from(
        { length: 60 },
        (_, i) => `Film ${i},2024-01-01`,
      );
      await service.importUpload({
        buffer: Buffer.from(`Name,Watched Date\n${rows.join("\n")}\n`),
        fileName: "diary.csv",
      });
      expect(recordWatch).toHaveBeenCalledTimes(60);
    });

    it("keeps importing after one watch fails to write", async () => {
      recordWatch.mockRejectedValueOnce(new Error("constraint"));
      const result = await service.importUpload({
        buffer: Buffer.from(
          "Name,Watched Date\nA,2024-01-01\nB,2024-01-02\n",
        ),
        fileName: "diary.csv",
      });
      expect(result.ok).toBe(true);
      expect(recordWatch).toHaveBeenCalledTimes(2);
    });

    it("counts a throwing list row as skipped and continues", async () => {
      upsertTitle.mockRejectedValueOnce(new Error("db"));
      const result = await service.importUpload({
        buffer: Buffer.from("Name\nA\nB\n"),
        fileName: "watchlist.csv",
      });
      expect(result.accepted).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe("partial failure", () => {
    it("completes with warnings when one file fails", async () => {
      const result = await service.importUpload({
        buffer: zip({
          "diary.csv": "Name,Watched Date\n",
          "watchlist.csv": WATCHLIST,
        }),
        fileName: "export.zip",
      });
      expect(result.files).toEqual(["watchlist"]);
      expect(result.warnings).toEqual([
        "watch csvs: diary.csv has no data rows",
      ]);
      expect(finalUpdate().data).toMatchObject({
        status: "completed",
        lastError: "watch csvs: diary.csv has no data rows",
      });
    });

    it("warns when a list file fails after watches succeed", async () => {
      const result = await service.importUpload({
        buffer: zip({
          "diary.csv": DIARY,
          "watchlist.csv": "Date,Year\n2024-01-02,2021\n",
        }),
        fileName: "export.zip",
      });
      expect(result.files).toEqual(["diary"]);
      expect(result.warnings).toEqual([
        "watchlist.csv: watchlist.csv must include a Name/Title column",
      ]);
    });
  });

  describe("fatal failure", () => {
    const failing: [string, string, string, string][] = [
      [
        "header-only diary",
        "Name,Watched Date\n",
        "diary.csv",
        "watch csvs: diary.csv has no data rows",
      ],
      [
        "empty diary",
        " ",
        "diary.csv",
        "watch csvs: diary.csv has no data rows",
      ],
      [
        "diary without a name column",
        "Watched Date,Year\n2024-01-01,2020\n",
        "diary.csv",
        "watch csvs: diary.csv must include a Name/Title column",
      ],
      [
        "diary without date columns",
        "Name,Year\nFilm,2020\n",
        "diary.csv",
        "watch csvs: diary.csv must include Watched Date or Date columns",
      ],
      [
        "ratings without a rating column",
        "Name,Year\nFilm,2020\n",
        "ratings.csv",
        "ratings.csv: ratings.csv must include a Rating column",
      ],
      [
        "header-only watchlist",
        "Name,Year\n",
        "watchlist.csv",
        "watchlist.csv: watchlist.csv has no data rows",
      ],
    ];

    it.each(failing)("fails the job for %s", async (_label, text, fileName, message) => {
      await expect(
        service.importUpload({ buffer: Buffer.from(text), fileName }),
      ).rejects.toThrow(message);
      expect(finalUpdate().data).toMatchObject({
        status: "failed",
        lastError: message,
        completedAt: expect.any(Date),
      });
    });

    it("fails the job for a corrupt zip named .zip", async () => {
      await expect(
        service.importUpload({
          buffer: Buffer.from("not a zip"),
          fileName: "export.zip",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(finalUpdate().data.status).toBe("failed");
      expect(finalUpdate().data.lastError).toBe(
        "Invalid or corrupted zip archive",
      );
      expect(upsertTitle).not.toHaveBeenCalled();
    });

    it("fails the job for a zip without Letterboxd CSVs", async () => {
      await expect(
        service.importUpload({
          buffer: zip({ "profile.csv": "x" }),
          fileName: "export.zip",
        }),
      ).rejects.toThrow("Zip contained none of");
      expect(finalUpdate().data.status).toBe("failed");
    });

    it("routes PK magic to the zip path even when named .csv", async () => {
      const result = await service.importUpload({
        buffer: zip({ "diary.csv": DIARY }),
        fileName: "disguised.csv",
      });
      expect(result.files).toEqual(["diary"]);
    });

    it("rejects a bare CSV outside the include list", async () => {
      await expect(
        service.importUpload({
          buffer: Buffer.from(DIARY),
          fileName: "diary.csv",
          include: ["ratings", "watchlist"],
        }),
      ).rejects.toThrow(
        "Uploaded CSV is diary.csv but include did not request it",
      );
      expect(finalUpdate().data.status).toBe("failed");
    });

    it("wraps infrastructure errors and truncates the stored message", async () => {
      const long = "x".repeat(600);
      update.mockRejectedValueOnce(new Error(long));
      const err = await service
        .importUpload({ buffer: Buffer.from(DIARY), fileName: "diary.csv" })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(finalUpdate().data.status).toBe("failed");
      expect(finalUpdate().data.lastError).toHaveLength(500);
    });

    it("still reports the original error when marking the job failed fails", async () => {
      update.mockRejectedValue(new Error("db down"));
      await expect(
        service.importUpload({
          buffer: Buffer.from(DIARY),
          fileName: "diary.csv",
        }),
      ).rejects.toThrow("db down");
    });
  });

  describe("importDiaryCsv", () => {
    it("forces the diary kind regardless of file name", async () => {
      const result = await service.importDiaryCsv(DIARY, "u1", "ratings.csv");
      expect(result.files).toEqual(["diary"]);
      expect(recordWatch).toHaveBeenCalledTimes(1);
    });

    it("defaults the stored file name", async () => {
      await service.importDiaryCsv(DIARY);
      expect(create.mock.calls[0][0].data.fileName).toBe("diary.csv");
    });
  });
});
