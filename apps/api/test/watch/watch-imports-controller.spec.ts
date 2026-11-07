import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException, RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { ImportsController } from "../../src/watch/imports/imports.controller";
import { WatchStatusController } from "../../src/watch/imports/watch-status.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { TraktService } from "../../src/watch/trakt/trakt.service";
import type { AnilistService } from "../../src/watch/anilist/anilist.service";

function upload(overrides: Partial<Express.Multer.File> = {}) {
  return {
    buffer: Buffer.from("csv"),
    originalname: "export.zip",
    ...overrides,
  } as Express.Multer.File;
}

describe("ImportsController", () => {
  const getActiveJob = vi.fn();
  const importUpload = vi.fn();
  let controller: ImportsController;

  beforeEach(() => {
    getActiveJob.mockReset().mockResolvedValue(null);
    importUpload.mockReset().mockResolvedValue({ ok: true });
    controller = new ImportsController({
      getActiveJob,
      importUpload,
    } as unknown as LetterboxdService);
  });

  it("returns the active job for the session user", async () => {
    getActiveJob.mockResolvedValue({ id: "job1" });
    await expect(controller.getActive("u1")).resolves.toEqual({ id: "job1" });
    expect(getActiveJob).toHaveBeenCalledWith("u1");
  });

  it.each([
    ["no file", undefined],
    ["no buffer", { originalname: "a.zip" } as Express.Multer.File],
    ["empty buffer", upload({ buffer: Buffer.alloc(0) })],
  ])("rejects an upload with %s", async (_label, file) => {
    await expect(
      controller.letterboxdImport(file, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(importUpload).not.toHaveBeenCalled();
  });

  it("forwards the buffer, name and session user", async () => {
    const file = upload();
    await expect(controller.letterboxdImport(file, "u1")).resolves.toEqual({
      ok: true,
    });
    expect(importUpload).toHaveBeenCalledWith({
      buffer: file.buffer,
      fileName: "export.zip",
      include: undefined,
      userId: "u1",
    });
  });

  it.each([
    ["../../etc/passwd", ".._.._etc_passwd"],
    ["..\\..\\win.ini", ".._.._win.ini"],
    ["/abs/path.csv", "_abs_path.csv"],
  ])("sanitizes file name %j", async (originalname, fileName) => {
    await controller.letterboxdImport(upload({ originalname }), "u1");
    expect(importUpload).toHaveBeenCalledWith(
      expect.objectContaining({ fileName }),
    );
  });

  it("defaults a blank file name", async () => {
    await controller.letterboxdImport(upload({ originalname: "" }), "u1");
    expect(importUpload).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "letterboxd.zip" }),
    );
  });

  it("parses the include field", async () => {
    await controller.letterboxdImport(upload(), "u1", "Diary, ratings+bogus");
    expect(importUpload).toHaveBeenCalledWith(
      expect.objectContaining({ include: ["diary", "ratings"] }),
    );
  });

  it("treats an include field with no known kinds as all kinds", async () => {
    await controller.letterboxdImport(upload(), "u1", "profile,reviews");
    expect(importUpload).toHaveBeenCalledWith(
      expect.objectContaining({ include: undefined }),
    );
  });

  it("propagates a conflict from the service", async () => {
    importUpload.mockRejectedValue(new ConflictException("running"));
    await expect(
      controller.letterboxdImport(upload(), "u1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ["getActive", "active", RequestMethod.GET],
    ["letterboxdImport", "letterboxd", RequestMethod.POST],
  ] as const)("guards %s", (name, path, method) => {
    const handler = ImportsController.prototype[name];
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      SessionUserGuard,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
  });

  it("registers the upload interceptor only on the import route", () => {
    expect(
      Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        ImportsController.prototype.letterboxdImport,
      ),
    ).toHaveLength(1);
    expect(
      Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        ImportsController.prototype.getActive,
      ),
    ).toBeUndefined();
  });
});

describe("WatchStatusController", () => {
  const getActiveJob = vi.fn();
  const traktConnection = vi.fn();
  const anilistConnection = vi.fn();
  let controller: WatchStatusController;

  beforeEach(() => {
    getActiveJob.mockReset().mockResolvedValue(null);
    traktConnection.mockReset().mockResolvedValue(null);
    anilistConnection.mockReset().mockResolvedValue(null);
    controller = new WatchStatusController(
      { getActiveJob } as unknown as LetterboxdService,
      { getConnection: traktConnection } as unknown as TraktService,
      { getConnection: anilistConnection } as unknown as AnilistService,
    );
  });

  const idle = { connected: false, syncing: false, lastSyncedAt: null };

  it("reports idle defaults when nothing is connected", async () => {
    await expect(controller.syncStatus("u1")).resolves.toEqual({
      active: false,
      letterboxd: null,
      trakt: idle,
      anilist: idle,
    });
  });

  it("queries every source for the session user", async () => {
    await controller.syncStatus("u1");
    expect(getActiveJob).toHaveBeenCalledWith("u1");
    expect(traktConnection).toHaveBeenCalledWith("u1");
    expect(anilistConnection).toHaveBeenCalledWith("u1");
  });

  it("is active while a Letterboxd job runs", async () => {
    const job = { id: "job1", percent: 40 };
    getActiveJob.mockResolvedValue(job);
    const result = await controller.syncStatus("u1");
    expect(result.active).toBe(true);
    expect(result.letterboxd).toBe(job);
  });

  it("is active while Trakt syncs", async () => {
    traktConnection.mockResolvedValue({
      connected: true,
      syncing: true,
      lastSyncedAt: "2024-01-01T00:00:00.000Z",
    });
    const result = await controller.syncStatus("u1");
    expect(result.active).toBe(true);
    expect(result.trakt).toEqual({
      connected: true,
      syncing: true,
      lastSyncedAt: "2024-01-01T00:00:00.000Z",
    });
    expect(result.anilist).toEqual(idle);
  });

  it("is active while AniList syncs", async () => {
    anilistConnection.mockResolvedValue({ connected: true, syncing: true });
    const result = await controller.syncStatus("u1");
    expect(result.active).toBe(true);
    expect(result.anilist).toEqual({
      connected: true,
      syncing: true,
      lastSyncedAt: null,
    });
  });

  it("is idle when sources are connected but not syncing", async () => {
    traktConnection.mockResolvedValue({ connected: true, syncing: false });
    anilistConnection.mockResolvedValue({ connected: true });
    const result = await controller.syncStatus("u1");
    expect(result.active).toBe(false);
    expect(result.anilist.syncing).toBe(false);
  });

  it("ignores a syncing flag on a disconnected source", async () => {
    traktConnection.mockResolvedValue({ connected: false, syncing: true });
    const result = await controller.syncStatus("u1");
    expect(result.active).toBe(false);
  });

  it("propagates a source failure", async () => {
    traktConnection.mockRejectedValue(new Error("trakt down"));
    await expect(controller.syncStatus("u1")).rejects.toThrow("trakt down");
  });

  it("guards the route", () => {
    const handler = WatchStatusController.prototype.syncStatus;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      SessionUserGuard,
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("sync-status");
  });
});
