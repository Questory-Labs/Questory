import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProfileExportService } from "../../src/profile-data/profile-export.service";
import { ProfileExportBuildService } from "../../src/profile-data/profile-export-build.service";
import { PROFILE_EXPORT_IN_FLIGHT } from "../../src/profile-data/profile-data.constants";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("ProfileExportService", () => {
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const updateMany = vi.fn();
  const del = vi.fn();
  const deleteStoredFile = vi.fn();
  const buildZip = vi.fn();
  const executeRaw = vi.fn();
  const transaction = vi.fn();

  let service: ProfileExportService;
  let prisma: PrismaService;

  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset().mockResolvedValue([]);
    create.mockReset();
    update.mockReset();
    updateMany.mockReset().mockResolvedValue({ count: 0 });
    del.mockReset();
    deleteStoredFile.mockReset();
    buildZip.mockReset();
    executeRaw.mockReset().mockResolvedValue(0);
    transaction.mockReset();
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("USE_INLINE_SYNC", "true");

    prisma = {
      profileExportJob: {
        findFirst,
        findMany,
        create,
        update,
        updateMany,
        delete: del,
      },
      $executeRaw: executeRaw,
      $transaction: transaction,
    } as unknown as PrismaService;

    transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );

    const build = {
      deleteStoredFile,
      buildZip,
    } as unknown as ProfileExportBuildService;

    service = new ProfileExportService(prisma, build);
  });

  it("returns 409 when an export is already in progress", async () => {
    findFirst.mockResolvedValue({ id: "job-1", status: "running" });
    await expect(service.enqueue("user-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalled();
  });

  it("marks the pending row failed when queue submission fails", async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: "job-2", status: "pending" });
    update.mockResolvedValue({});
    const add = vi.fn().mockRejectedValue(new Error("redis down"));
    (
      service as unknown as {
        inlineMode: boolean;
        queue: { add: typeof add };
      }
    ).inlineMode = false;
    (
      service as unknown as {
        inlineMode: boolean;
        queue: { add: typeof add };
      }
    ).queue = { add };

    await expect(service.enqueue("user-1")).rejects.toThrow("redis down");
    expect(update).toHaveBeenCalledWith({
      where: { id: "job-2" },
      data: expect.objectContaining({
        status: "failed",
        lastError: "redis down",
      }),
    });
  });

  it("completes the replacement job before deleting previous exports", async () => {
    const built = {
      storageKey: "new.zip",
      fileName: "questory-profile.zip",
      byteSize: 12,
      expiresAt: new Date("2026-09-26T00:00:00.000Z"),
    };
    buildZip.mockResolvedValue(built);
    update.mockResolvedValue({});
    findMany.mockResolvedValueOnce([
      { id: "old", storageKey: "old.zip", status: "completed" },
    ]);
    del.mockResolvedValue({});

    await (
      service as unknown as {
        process: (data: { userId: string; jobId: string }) => Promise<void>;
      }
    ).process({ userId: "user-1", jobId: "job-new" });

    expect(update.mock.calls[0][0]).toEqual({
      where: { id: "job-new" },
      data: expect.objectContaining({ status: "running" }),
    });
    expect(update.mock.calls[1][0]).toEqual({
      where: { id: "job-new" },
      data: expect.objectContaining({
        status: "completed",
        storageKey: "new.zip",
      }),
    });
    expect(deleteStoredFile).toHaveBeenCalledWith("old.zip");
    expect(del).toHaveBeenCalledWith({ where: { id: "old" } });
    expect(update.mock.invocationCallOrder[1]).toBeLessThan(
      deleteStoredFile.mock.invocationCallOrder[0],
    );
  });

  it("keeps the replacement completed when previous-export cleanup fails", async () => {
    const warn = vi.spyOn(service["logger"], "warn").mockImplementation(() => undefined);
    buildZip.mockResolvedValue({
      storageKey: "new.zip",
      fileName: "questory-profile.zip",
      byteSize: 12,
      expiresAt: new Date("2026-09-26T00:00:00.000Z"),
    });
    update.mockResolvedValue({});
    findMany.mockResolvedValueOnce([
      { id: "old", storageKey: "old.zip", status: "completed" },
    ]);
    deleteStoredFile.mockRejectedValue(new Error("EACCES"));

    await (
      service as unknown as {
        process: (data: { userId: string; jobId: string }) => Promise<void>;
      }
    ).process({ userId: "user-1", jobId: "job-new" });

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1][0].data.status).toBe("completed");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("previous profile export old"),
    );
    warn.mockRestore();
  });

  it("only counts in-flight rows that actually transitioned during reconcile", async () => {
    findMany.mockResolvedValueOnce([
      { id: "job-a", status: "pending" },
      { id: "job-b", status: "running" },
    ]);
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    (
      service as unknown as { queue: { getJobs: ReturnType<typeof vi.fn> } }
    ).queue = { getJobs: vi.fn().mockResolvedValue([]) };
    const warn = vi.spyOn(service["logger"], "warn").mockImplementation(() => undefined);

    await (
      service as unknown as { reconcileQueuedExports: () => Promise<void> }
    ).reconcileQueuedExports();

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "job-a",
        status: { in: [...PROFILE_EXPORT_IN_FLIGHT] },
      },
      data: expect.objectContaining({ status: "failed" }),
    });
    expect(update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Marked 1 unresumable profile export(s) as failed",
    );
    warn.mockRestore();
  });

  it("keeps the completed row when stored-file cleanup fails", async () => {
    findMany.mockResolvedValueOnce([
      { id: "old", storageKey: "old.zip", status: "completed" },
    ]);
    deleteStoredFile.mockRejectedValue(
      Object.assign(new Error("EACCES"), { code: "EACCES" }),
    );
    await expect(service.purgeExpired("user-1")).rejects.toThrow("EACCES");
    expect(del).not.toHaveBeenCalled();
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
