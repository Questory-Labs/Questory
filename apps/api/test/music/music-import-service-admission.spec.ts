import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { BadRequestException, ConflictException, Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ root: "", parse: vi.fn() }));

vi.mock("../../src/music/imports/temp-dir", () => ({
  resolveRepoTempDir: () => state.root,
}));
vi.mock("../../src/music/imports/parse-in-worker", () => ({
  parseImportInWorker: state.parse,
}));

import { ImportsService } from "../../src/music/imports/imports.service";

describe("ImportsService admission and error exposure", () => {
  let uploadDir: string;
  let uploadPath: string;
  let warn: ReturnType<typeof vi.spyOn>;

  const setup = () => {
    const importJob = {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "job-1",
        createdAt: new Date(),
        ...data,
      })),
      update: vi.fn().mockResolvedValue({}),
    };
    const $transaction = vi.fn(async (run: (tx: unknown) => unknown) =>
      run({ importJob }),
    );
    const service = new ImportsService(
      { importJob, $transaction } as never,
      {} as never,
      { enqueueIncompleteCatalog: vi.fn().mockResolvedValue(0) } as never,
      { findById: vi.fn().mockResolvedValue({ id: "u-1" }) } as never,
      { assertSourceEnabled: vi.fn() } as never,
    );
    return { service, importJob, $transaction };
  };

  const start = (service: ImportsService) =>
    service.startImport(uploadPath, "upload.json", "u-1", "maloja_json");

  beforeEach(async () => {
    state.root = await mkdtemp(join(tmpdir(), "music-import-admit-"));
    uploadDir = join(state.root, "music-uploads", "abc");
    uploadPath = join(uploadDir, "upload.json");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, "{}");
    state.parse.mockReset();
    state.parse.mockResolvedValue([]);
    warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 5));
    warn.mockRestore();
    vi.unstubAllEnvs();
    await rm(state.root, { recursive: true, force: true });
  });

  it("re-checks for a running job inside the admission transaction", async () => {
    const { service, importJob } = setup();
    importJob.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "winner" });
    const err = await start(service).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ jobId: "winner" });
    expect(importJob.create).not.toHaveBeenCalled();
  });

  it.each(["P2002", "P2034"])(
    "turns a lost race (%s) into a conflict naming the winner",
    async (code) => {
      const { service, importJob, $transaction } = setup();
      $transaction.mockRejectedValueOnce(Object.assign(new Error("x"), { code }));
      importJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "winner" });
      const err = await start(service).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse()).toMatchObject({
        statusCode: 409,
        jobId: "winner",
      });
      expect(state.parse).not.toHaveBeenCalled();
    },
  );

  it("still conflicts when the winner already finished", async () => {
    const { service, $transaction } = setup();
    $transaction.mockRejectedValueOnce(
      Object.assign(new Error("x"), { code: "P2002" }),
    );
    await expect(start(service)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rethrows other transaction failures", async () => {
    const { service, $transaction } = setup();
    const failure = new Error("db down");
    $transaction.mockRejectedValueOnce(failure);
    await expect(start(service)).rejects.toBe(failure);
  });

  it("serializes admission on postgres", async () => {
    vi.stubEnv("DATABASE_PROVIDER", "postgresql");
    const { service, $transaction } = setup();
    await start(service);
    expect($transaction.mock.calls[0][1 as never]).toEqual({
      isolationLevel: "Serializable",
    });
  });

  it("uses a plain transaction on sqlite", async () => {
    vi.stubEnv("DATABASE_PROVIDER", "sqlite");
    const { service, $transaction } = setup();
    await start(service);
    expect($transaction.mock.calls[0][1 as never]).toBeUndefined();
  });

  it("does not expose fs paths when staging fails", async () => {
    const { service } = setup();
    await rm(uploadDir, { recursive: true });
    const err = await start(service).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe("Failed to stage upload");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ENOENT"));
  });

  it("does not expose fs paths when detection cannot read the file", async () => {
    const { service, importJob } = setup();
    await rm(uploadPath);
    const err = await service
      .startImport(uploadPath, "upload.bin", "u-1")
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe("Failed to read upload");
    expect(importJob.create).not.toHaveBeenCalled();
  });
});
