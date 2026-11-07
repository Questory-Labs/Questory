import { existsSync } from "fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  root: "",
  parse: vi.fn(),
}));

vi.mock("../../src/music/imports/temp-dir", () => ({
  resolveRepoTempDir: () => state.root,
}));
vi.mock("../../src/music/imports/parse-in-worker", () => ({
  parseImportInWorker: state.parse,
}));

import { ImportsService } from "../../src/music/imports/imports.service";

const MUSIC_SOURCES = [
  "koito_db",
  "koito_json",
  "spotify_json",
  "maloja_json",
  "lastfm_json",
  "listenbrainz_zip",
];

function setup() {
  const importJob = {
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async ({ data }) => ({
      id: "job-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      ...data,
    })),
    update: vi.fn().mockResolvedValue({}),
  };
  const prisma = {
    importJob,
    $transaction: vi.fn(async (run: (tx: unknown) => unknown) =>
      run({ importJob }),
    ),
  };
  const catalog = {
    upsertListen: vi.fn().mockResolvedValue({
      created: true,
      track: { id: "t1" },
    }),
  };
  const enrichment = {
    trackNeedsEnrichment: vi.fn().mockResolvedValue(false),
    enqueueTrack: vi.fn().mockResolvedValue(undefined),
    enqueueIncompleteCatalog: vi.fn().mockResolvedValue(0),
  };
  const users = { findById: vi.fn().mockResolvedValue({ id: "u-1" }) };
  const flags = { assertSourceEnabled: vi.fn().mockResolvedValue(undefined) };
  const service = new ImportsService(
    prisma as never,
    catalog as never,
    enrichment as never,
    users as never,
    flags as never,
  );
  return { service, prisma, catalog, enrichment, users, flags };
}

describe("ImportsService startup", () => {
  it("fails only interrupted music jobs", async () => {
    const { service, prisma } = setup();
    await service.onModuleInit();
    const arg = prisma.importJob.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({
      status: "running",
      source: { in: MUSIC_SOURCES },
    });
    expect(arg.data).toMatchObject({
      status: "failed",
      lastError: "Interrupted by music service restart",
    });
    expect(arg.data.completedAt).toBeInstanceOf(Date);
  });

  it("warns only when jobs were interrupted", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const { service, prisma } = setup();
    await service.onModuleInit();
    expect(warn).not.toHaveBeenCalled();
    prisma.importJob.updateMany.mockResolvedValueOnce({ count: 2 });
    await service.onModuleInit();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe("ImportsService.startImport", () => {
  let uploadDir: string;
  let uploadPath: string;
  const body = JSON.stringify({ scrobbles: [] });

  beforeEach(async () => {
    state.root = await mkdtemp(join(tmpdir(), "music-import-service-"));
    uploadDir = join(state.root, "music-uploads", "abc");
    uploadPath = join(uploadDir, "upload.json");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, body);
    state.parse.mockReset();
    state.parse.mockResolvedValue([]);
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 5));
    await rm(state.root, { recursive: true, force: true });
  });

  it("rejects an unknown user before touching jobs", async () => {
    const { service, prisma, users } = setup();
    users.findById.mockResolvedValueOnce(null);
    await expect(
      service.startImport(uploadPath, "upload.json", "ghost"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.importJob.findFirst).not.toHaveBeenCalled();
    expect(prisma.importJob.create).not.toHaveBeenCalled();
  });

  it("scopes the active-job check to the user's music imports", async () => {
    const { service, prisma } = setup();
    await service.startImport(uploadPath, "upload.json", "u-1");
    expect(prisma.importJob.findFirst.mock.calls[0][0].where).toEqual({
      userId: "u-1",
      status: "running",
      source: { in: MUSIC_SOURCES },
    });
  });

  it("conflicts with the running job and exposes its id", async () => {
    const { service, prisma } = setup();
    prisma.importJob.findFirst.mockResolvedValueOnce({ id: "running-1" });
    const err = await service
      .startImport(uploadPath, "upload.json", "u-1")
      .catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({
      statusCode: 409,
      jobId: "running-1",
    });
    expect(prisma.importJob.create).not.toHaveBeenCalled();
  });

  it("creates a job for the resolved user with the detected source", async () => {
    const { service, prisma } = setup();
    const res = await service.startImport(uploadPath, "upload.json", "u-1");
    expect(prisma.importJob.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        source: "maloja_json",
        status: "running",
        fileName: "upload.json",
      },
    });
    expect(res).toMatchObject({
      ok: true,
      jobId: "job-1",
      id: "job-1",
      source: "maloja_json",
      status: "running",
      total: 0,
      processed: 0,
      percent: null,
      phase: "parsing",
      lastError: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      completedAt: null,
    });
  });

  it("uses the override without sniffing the file", async () => {
    const { service, prisma } = setup();
    await writeFile(uploadPath, "unrecognizable");
    await service.startImport(uploadPath, "upload.json", "u-1", "lastfm_json");
    expect(prisma.importJob.create.mock.calls[0][0].data.source).toBe(
      "lastfm_json",
    );
  });

  it("rejects an unrecognized file without creating a job", async () => {
    const { service, prisma } = setup();
    await writeFile(uploadPath, "unrecognizable");
    const err = await service
      .startImport(uploadPath, "upload.bin", "u-1")
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toMatch(/Unrecognized import file/);
    expect(prisma.importJob.create).not.toHaveBeenCalled();
  });

  it("gates spotify imports on the source flag", async () => {
    const { service, flags, prisma } = setup();
    flags.assertSourceEnabled.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.startImport(uploadPath, "upload.json", "u-1", "spotify_json"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(flags.assertSourceEnabled).toHaveBeenCalledWith("spotify");
    expect(prisma.importJob.create).not.toHaveBeenCalled();
  });

  it("gates detected spotify files too", async () => {
    const { service, flags } = setup();
    await service.startImport(
      uploadPath,
      "Streaming_History_Audio_1.json",
      "u-1",
    );
    expect(flags.assertSourceEnabled).toHaveBeenCalledWith("spotify");
  });

  it("does not gate other sources", async () => {
    const { service, flags } = setup();
    await service.startImport(uploadPath, "upload.json", "u-1");
    expect(flags.assertSourceEnabled).not.toHaveBeenCalled();
  });

  it("moves the upload into per-job staging for the worker", async () => {
    const { service } = setup();
    let staged = "";
    state.parse.mockImplementationOnce(async (_source, path) => {
      staged = await readFile(path, "utf8");
      return [];
    });
    await service.startImport(uploadPath, "upload.json", "u-1");
    await vi.waitFor(() => expect(staged).toBe(body));
    expect(state.parse).toHaveBeenCalledWith(
      "maloja_json",
      join(state.root, "music-imports", "job-1", "upload.json"),
    );
    expect(existsSync(uploadDir)).toBe(false);
  });

  it("removes staging after the job ends", async () => {
    const { service } = setup();
    await service.startImport(uploadPath, "upload.json", "u-1");
    await vi.waitFor(() =>
      expect(existsSync(join(state.root, "music-imports", "job-1"))).toBe(false),
    );
  });

  it("records a null fileName and a fallback staged name for an empty name", async () => {
    const { service, prisma } = setup();
    await service.startImport(uploadPath, "", "u-1", "maloja_json");
    expect(prisma.importJob.create.mock.calls[0][0].data.fileName).toBeNull();
    expect(state.parse).toHaveBeenCalledWith(
      "maloja_json",
      join(state.root, "music-imports", "job-1", "import.bin"),
    );
  });

  it("fails the job and cleans up when staging fails", async () => {
    const { service, prisma } = setup();
    await rm(uploadDir, { recursive: true });
    await expect(
      service.startImport(uploadPath, "upload.json", "u-1", "maloja_json"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.importJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "failed",
        lastError: "Failed to stage upload under temp/",
        completedAt: expect.any(Date),
      }),
    });
    expect(state.parse).not.toHaveBeenCalled();
    expect(existsSync(join(state.root, "music-imports", "job-1"))).toBe(false);
  });
});

describe("ImportsService job queries", () => {
  const row = (overrides = {}) => ({
    id: "j1",
    source: "maloja_json",
    status: "running",
    fileName: "a.json",
    total: 0,
    accepted: 0,
    skipped: 0,
    lastError: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    completedAt: null,
    ...overrides,
  });

  it("scopes getActiveJob to the user's running music imports", async () => {
    const { service, prisma } = setup();
    await expect(service.getActiveJob("u-2")).resolves.toBeNull();
    expect(prisma.importJob.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u-2",
        status: "running",
        source: { in: MUSIC_SOURCES },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("scopes getJob by owner and hides other users' jobs", async () => {
    const { service, prisma } = setup();
    await expect(service.getJob("j1", "u-2")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.importJob.findFirst).toHaveBeenCalledWith({
      where: { id: "j1", userId: "u-2" },
    });
  });

  it("reports the parsing phase before a total exists", async () => {
    const { service, prisma } = setup();
    prisma.importJob.findFirst.mockResolvedValueOnce(row());
    expect(await service.getActiveJob("u-1")).toMatchObject({
      phase: "parsing",
      percent: null,
      processed: 0,
    });
  });

  it("reports importing progress with a rounded percent", async () => {
    const { service, prisma } = setup();
    prisma.importJob.findFirst.mockResolvedValueOnce(
      row({ total: 3, accepted: 1, skipped: 1 }),
    );
    expect(await service.getJob("j1", "u-1")).toMatchObject({
      phase: "importing",
      processed: 2,
      percent: 67,
    });
  });

  it("caps percent at 100", async () => {
    const { service, prisma } = setup();
    prisma.importJob.findFirst.mockResolvedValueOnce(
      row({ total: 2, accepted: 3, skipped: 3 }),
    );
    expect((await service.getJob("j1", "u-1")).percent).toBe(100);
  });

  it("serializes terminal jobs", async () => {
    const { service, prisma } = setup();
    prisma.importJob.findFirst.mockResolvedValueOnce(
      row({
        status: "failed",
        total: 4,
        accepted: 4,
        lastError: "boom",
        completedAt: new Date("2024-01-02T00:00:00Z"),
      }),
    );
    expect(await service.getJob("j1", "u-1")).toMatchObject({
      status: "failed",
      phase: "failed",
      percent: 100,
      lastError: "boom",
      completedAt: "2024-01-02T00:00:00.000Z",
    });
  });
});
