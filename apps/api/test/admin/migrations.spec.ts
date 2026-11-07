import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { MigrationsService } from "../../src/admin/migrations/migrations.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { SourceDataRepairService } from "../../src/admin/migrations/source-data-repair.service";

describe("MigrationsService", () => {
  const findMany = vi.fn();
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const update = vi.fn();
  const repairLetterboxdDuplicates = vi.fn();
  const repairBangumiKeys = vi.fn();

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

    repairBangumiKeys.mockReset().mockResolvedValue({ rekeyed: 1 });
    const sourceRepair = {
      repairBangumiKeys,
    } as unknown as SourceDataRepairService;

    service = new MigrationsService(prisma, letterboxd, sourceRepair);
  });

  it("lists registered migrations with not_run when no db row", async () => {
    const result = await service.listMigrations();
    expect(result.migrations.map((m) => m.key)).toEqual([
      "letterboxd_watch_dedupe_v1",
      "bangumi_dedupe_keys_v1",
      "webhook_music_events_v1",
      "watch_hour_buckets_rebuild_v1",
    ]);
    expect(result.migrations[0]).toMatchObject({
      key: "letterboxd_watch_dedupe_v1",
      status: "not_run",
      hasRun: false,
      canRun: true,
    });
  });

  it("previews without writing migration state", async () => {
    await expect(service.previewMigration("bangumi_dedupe_keys_v1")).resolves.toEqual({
      ok: true,
      key: "bangumi_dedupe_keys_v1",
      result: { rekeyed: 1 },
    });
    expect(repairBangumiKeys).toHaveBeenCalledWith(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("applies when run", async () => {
    await service.runMigration("bangumi_dedupe_keys_v1", "admin-1");
    expect(repairBangumiKeys).toHaveBeenCalledWith(true);
  });

  it("rejects a preview for a migration without one", async () => {
    await expect(
      service.previewMigration("letterboxd_watch_dedupe_v1"),
    ).rejects.toThrow("has no preview");
    expect(repairLetterboxdDuplicates).not.toHaveBeenCalled();
  });

  it("rejects a preview for an unknown migration", async () => {
    await expect(service.previewMigration("nope")).rejects.toThrow(NotFoundException);
  });

  it("exposes the failure timestamp for failed migrations", async () => {
    const updatedAt = new Date("2026-10-25T21:04:00.000Z");
    findMany.mockResolvedValue([
      {
        key: "letterboxd_watch_dedupe_v1",
        status: "failed",
        runCount: 2,
        lastStartedAt: new Date("2026-10-25T21:02:00.000Z"),
        lastCompletedAt: null,
        lastError: "boom",
        lastResult: "{}",
        updatedAt,
      },
    ]);
    const result = await service.listMigrations();
    expect(result.migrations[0]).toMatchObject({
      status: "failed",
      lastFailedAt: updatedAt.toISOString(),
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
