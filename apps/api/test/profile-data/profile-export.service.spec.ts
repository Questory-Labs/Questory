import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProfileExportService } from "../../src/profile-data/profile-export.service";
import { ProfileExportBuildService } from "../../src/profile-data/profile-export-build.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("ProfileExportService", () => {
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const updateMany = vi.fn();
  const del = vi.fn();
  const deleteStoredFile = vi.fn();

  let service: ProfileExportService;

  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset().mockResolvedValue([]);
    create.mockReset();
    update.mockReset();
    updateMany.mockReset().mockResolvedValue({ count: 0 });
    del.mockReset();
    deleteStoredFile.mockReset();
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("USE_INLINE_SYNC", "true");

    const prisma = {
      profileExportJob: {
        findFirst,
        findMany,
        create,
        update,
        updateMany,
        delete: del,
      },
    } as unknown as PrismaService;

    const build = {
      deleteStoredFile,
    } as unknown as ProfileExportBuildService;

    service = new ProfileExportService(prisma, build);
  });

  it("returns 409 when an export is already in progress", async () => {
    findFirst.mockResolvedValue({ id: "job-1", status: "running" });
    await expect(service.enqueue("user-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("deletes expired completed jobs on status", async () => {
    findMany.mockResolvedValueOnce([
      { id: "old", storageKey: "old.zip", status: "completed" },
    ]);
    findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    del.mockResolvedValue({});

    const status = await service.getStatus("user-1");
    expect(deleteStoredFile).toHaveBeenCalledWith("old.zip");
    expect(del).toHaveBeenCalledWith({ where: { id: "old" } });
    expect(status.status).toBe("none");
    expect(status.downloadReady).toBe(false);
  });

  it("throws when no completed zip is available", async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.openFile("user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
