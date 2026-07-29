import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { MigrationsService } from "../../src/admin/migrations/migrations.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { LetterboxdService } from "../../src/watch/imports/letterboxd.service";

describe("MigrationsService", () => {
  const findMany = vi.fn();
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const update = vi.fn();
  const repairLetterboxdDuplicates = vi.fn();

  let service: MigrationsService;

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findUnique.mockReset().mockResolvedValue(null);
    upsert.mockReset().mockResolvedValue({});
    update.mockReset().mockResolvedValue({});
    repairLetterboxdDuplicates
      .mockReset()
      .mockResolvedValue({
        scanned: 10,
        groups: 8,
        legacyKeys: 5,
        alreadyCanonical: 5,
        duplicateGroups: 2,
        merged: 2,
        migrated: 1,
      });

    const prisma = {
      dataMigration: {
        findMany,
        findUnique,
        upsert,
        update,
      },
    } as unknown as PrismaService;

    const letterboxd = {
      repairLetterboxdDuplicates,
    } as unknown as LetterboxdService;

    service = new MigrationsService(prisma, letterboxd);
  });

  it("lists registered migrations with not_run when no db row", async () => {
    const result = await service.listMigrations();
    expect(result.migrations).toHaveLength(1);
    expect(result.migrations[0]).toMatchObject({
      key: "letterboxd_watch_dedupe_v1",
      status: "not_run",
      hasRun: false,
      canRun: true,
    });
  });

  it("runs letterboxd migration and records completion", async () => {
    const result = await service.runMigration(
      "letterboxd_watch_dedupe_v1",
      "admin1",
    );

    expect(repairLetterboxdDuplicates).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "letterboxd_watch_dedupe_v1" },
        create: expect.objectContaining({ status: "running" }),
      }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { key: "letterboxd_watch_dedupe_v1" },
      data: {
        status: "completed",
        lastCompletedAt: expect.any(Date),
        lastResult: JSON.stringify({
          scanned: 10,
          groups: 8,
          legacyKeys: 5,
          alreadyCanonical: 5,
          duplicateGroups: 2,
          merged: 2,
          migrated: 1,
        }),
      },
    });
    expect(result).toEqual({
      ok: true,
      key: "letterboxd_watch_dedupe_v1",
      result: {
        scanned: 10,
        groups: 8,
        legacyKeys: 5,
        alreadyCanonical: 5,
        duplicateGroups: 2,
        merged: 2,
        migrated: 1,
      },
    });
  });

  it("rejects unknown migration keys", async () => {
    await expect(
      service.runMigration("does-not-exist", "admin1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
