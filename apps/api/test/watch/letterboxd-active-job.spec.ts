import { beforeEach, describe, expect, it, vi } from "vitest";
import { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("LetterboxdService active job", () => {
  const findFirst = vi.fn();
  const resolveUser = vi.fn();
  let service: LetterboxdService;

  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
    resolveUser.mockReset().mockResolvedValue({ id: "u1" });
    service = new LetterboxdService(
      { importJob: { findFirst } } as unknown as PrismaService,
      {} as unknown as CatalogService,
      {} as unknown as EnrichmentService,
      { configured: () => false } as unknown as TmdbService,
      { resolveUser } as unknown as UsersService,
    );
  });

  describe("getActiveJob", () => {
    const job = {
      id: "job1",
      source: "letterboxd_csv",
      status: "running",
      fileName: "export.zip",
      total: 10,
      accepted: 2,
      skipped: 1,
      lastError: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      completedAt: null,
    };

    it("returns null when no user resolves", async () => {
      resolveUser.mockResolvedValue(null);
      await expect(service.getActiveJob("u1")).resolves.toBeNull();
      expect(findFirst).not.toHaveBeenCalled();
    });

    it("returns null when nothing is running", async () => {
      await expect(service.getActiveJob("u1")).resolves.toBeNull();
    });

    it("queries only the caller's running Letterboxd job", async () => {
      await service.getActiveJob("u1");
      expect(findFirst).toHaveBeenCalledWith({
        where: { userId: "u1", source: "letterboxd_csv", status: "running" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("serializes progress", async () => {
      findFirst.mockResolvedValue(job);
      await expect(service.getActiveJob("u1")).resolves.toEqual({
        id: "job1",
        source: "letterboxd_csv",
        status: "running",
        fileName: "export.zip",
        total: 10,
        accepted: 2,
        skipped: 1,
        processed: 3,
        percent: 30,
        lastError: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        completedAt: null,
      });
    });

    it.each([
      [0, 0, 0, null],
      [3, 0, 1, 33],
      [10, 20, 5, 100],
    ])("computes percent for total=%i accepted=%i skipped=%i", async (total, accepted, skipped, percent) => {
      findFirst.mockResolvedValue({ ...job, total, accepted, skipped });
      const result = await service.getActiveJob("u1");
      expect(result?.percent).toBe(percent);
    });

    it("serializes completedAt when set", async () => {
      findFirst.mockResolvedValue({
        ...job,
        completedAt: new Date("2024-01-02T00:00:00.000Z"),
      });
      const result = await service.getActiveJob("u1");
      expect(result?.completedAt).toBe("2024-01-02T00:00:00.000Z");
    });
  });
});
