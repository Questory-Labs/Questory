import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  ReadProgressService,
  manualProgressPercent,
} from "../../src/read/catalog/progress.service";
import { ReadProgressController } from "../../src/read/catalog/progress.controller";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { ReadCatalogService } from "../../src/read/catalog/catalog.service";

describe("ReadProgressService", () => {
  const findTitle = vi.fn();
  const findStates = vi.fn();
  const recordProgress = vi.fn();
  const upsertListState = vi.fn();
  const findEvent = vi.fn();
  let service: ReadProgressService;

  beforeEach(() => {
    findTitle.mockReset().mockResolvedValue({ id: "t-1", chapters: 100 });
    findStates.mockReset().mockResolvedValue([
      { progressChapters: 40 },
      { progressChapters: 45 },
    ]);
    recordProgress.mockReset().mockResolvedValue({ id: "ev-1" });
    upsertListState.mockReset().mockResolvedValue({});
    findEvent.mockReset().mockResolvedValue(null);
    service = new ReadProgressService(
      {
        readTitle: { findUnique: findTitle },
        readListState: { findMany: findStates },
        readEvent: { findUnique: findEvent },
      } as unknown as PrismaService,
      {
        resolveUser: vi.fn().mockResolvedValue({ id: "u-1" }),
      } as unknown as UsersService,
      { recordProgress, upsertListState } as unknown as ReadCatalogService,
    );
  });

  it("records the delta over the highest progress and upserts manual state", async () => {
    const result = await service.log("u-1", "t-1", { chapter: 46 });

    expect(recordProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        readTitleId: "t-1",
        source: "manual",
        action: "progress",
        precision: "exact",
        chaptersRead: 1,
        chaptersDelta: 1,
        progress: 46,
        dedupeKey: "manual:t-1:ch46:v",
      }),
    );
    expect(upsertListState).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "manual",
        listStatus: "reading",
        progressChapters: 46,
      }),
    );
    expect(result).toEqual({
      id: "ev-1",
      readTitleId: "t-1",
      chapter: 46,
      volume: null,
      chaptersRead: 1,
      listStatus: "reading",
    });
  });

  it("does not re-count a chapter that was already logged", async () => {
    findEvent.mockResolvedValue({ id: "ev-old" });
    const result = await service.log("u-1", "t-1", { chapter: 46 });
    expect(findEvent).toHaveBeenCalledWith({
      where: { userId_dedupeKey: { userId: "u-1", dedupeKey: "manual:t-1:ch46:v" } },
      select: { id: true },
    });
    expect(recordProgress).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: "ev-old", chaptersRead: 0 });
    expect(upsertListState).toHaveBeenCalledWith(
      expect.objectContaining({ progressChapters: 46 }),
    );
  });

  it("marks completed at the final chapter and never goes negative", async () => {
    const done = await service.log("u-1", "t-1", { chapter: 100, volume: 10 });
    expect(done.listStatus).toBe("completed");
    const back = await service.log("u-1", "t-1", { chapter: 10 });
    expect(back.chaptersRead).toBe(0);
  });

  it("404s for an unknown title", async () => {
    findTitle.mockResolvedValueOnce(null);
    await expect(service.log("u-1", "x", { chapter: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("estimates percent without a chapter total", () => {
    expect(manualProgressPercent(5, null)).toBe(50);
    expect(manualProgressPercent(0, null)).toBe(0);
    expect(manualProgressPercent(50, 200)).toBe(25);
  });
});

describe("ReadProgressController", () => {
  it("validates the body", () => {
    const log = vi.fn().mockResolvedValue({});
    const ctrl = new ReadProgressController({ log } as unknown as ReadProgressService);
    ctrl.log("u-1", "t-1", { chapter: 3, volume: 1 });
    expect(log).toHaveBeenCalledWith("u-1", "t-1", { chapter: 3, volume: 1 });
    expect(() => ctrl.log("u-1", "t-1", { chapter: -1 })).toThrow(BadRequestException);
    expect(() => ctrl.log("u-1", "t-1", { chapter: "x" })).toThrow(BadRequestException);
  });
});
