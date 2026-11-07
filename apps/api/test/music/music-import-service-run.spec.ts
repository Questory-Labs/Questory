import { existsSync } from "fs";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Logger } from "@nestjs/common";
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
import { ImportParseError } from "../../src/music/imports/parsers/types";

const MBID = "11111111-2222-3333-4444-555555555555";

const listen = (overrides: Record<string, unknown> = {}) => ({
  artistName: "A",
  trackName: "T",
  listenedAt: new Date("2024-01-01T00:00:00Z"),
  ...overrides,
});

describe("ImportsService background job", () => {
  let uploadPath: string;
  let update: ReturnType<typeof vi.fn>;
  let upsertListen: ReturnType<typeof vi.fn>;
  let enrichment: {
    trackNeedsEnrichment: ReturnType<typeof vi.fn>;
    enqueueTrack: ReturnType<typeof vi.fn>;
    enqueueIncompleteCatalog: ReturnType<typeof vi.fn>;
  };
  let service: ImportsService;

  const stagingDir = () => join(state.root, "music-imports", "job-1");

  const runWith = async (listens: unknown[] | Error) => {
    if (listens instanceof Error) state.parse.mockRejectedValue(listens);
    else state.parse.mockResolvedValue(listens);
    await service.startImport(uploadPath, "upload.json", "u-1", "maloja_json");
    await vi.waitFor(() => expect(existsSync(stagingDir())).toBe(false));
  };

  const updates = () => update.mock.calls.map((c) => c[0].data);
  const terminal = () =>
    updates().find((d) => d.status === "completed" || d.status === "failed");

  beforeEach(async () => {
    state.root = await mkdtemp(join(tmpdir(), "music-import-run-"));
    const uploadDir = join(state.root, "music-uploads", "abc");
    uploadPath = join(uploadDir, "upload.json");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, "{}");
    state.parse.mockReset();

    update = vi.fn().mockResolvedValue({});
    upsertListen = vi.fn().mockImplementation(async (_u, item) => ({
      created: true,
      track: { id: `track:${item.trackName}` },
    }));
    enrichment = {
      trackNeedsEnrichment: vi.fn().mockResolvedValue(false),
      enqueueTrack: vi.fn().mockResolvedValue(undefined),
      enqueueIncompleteCatalog: vi.fn().mockResolvedValue(0),
    };
    const importJob = {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "job-1",
        createdAt: new Date(),
        ...data,
      })),
      update,
    };
    service = new ImportsService(
      {
        importJob,
        $transaction: vi.fn(async (run: (tx: unknown) => unknown) =>
          run({ importJob }),
        ),
      } as never,
      { upsertListen } as never,
      enrichment as never,
      { findById: vi.fn().mockResolvedValue({ id: "u-1" }) } as never,
      { assertSourceEnabled: vi.fn() } as never,
    );
  });

  afterEach(async () => {
    await rm(state.root, { recursive: true, force: true });
  });

  it("upserts every field for the owning user as an import listen", async () => {
    const item = listen({
      releaseName: "R",
      recordingMbid: MBID,
      releaseMbid: MBID,
      artistMbids: [MBID],
      durationMs: 1000,
      mediaPlayer: "mp",
      submissionClient: "sc",
      musicService: "ms",
    });
    await runWith([item]);
    expect(upsertListen).toHaveBeenCalledOnce();
    const [userId, payload, cache] = upsertListen.mock.calls[0];
    expect(userId).toBe("u-1");
    expect(payload).toEqual({ ...item, listenType: "import" });
    expect(cache).toBeDefined();
  });

  it("shares one entity cache across the job", async () => {
    await runWith([listen(), listen()]);
    expect(upsertListen.mock.calls[0][2]).toBe(upsertListen.mock.calls[1][2]);
  });

  it("records the total before importing", async () => {
    await runWith([listen(), listen()]);
    expect(updates()[0]).toEqual({ total: 2 });
    expect(update.mock.calls.every((c) => c[0].where.id === "job-1")).toBe(true);
  });

  it("counts created and duplicate listens separately", async () => {
    upsertListen
      .mockResolvedValueOnce({ created: true, track: { id: "a" } })
      .mockResolvedValueOnce({ created: false, track: { id: "a" } })
      .mockResolvedValueOnce({ created: true, track: { id: "b" } });
    await runWith([listen(), listen(), listen()]);
    expect(terminal()).toMatchObject({
      status: "completed",
      total: 3,
      accepted: 2,
      skipped: 1,
      completedAt: expect.any(Date),
    });
  });

  it("counts a failing listen as skipped and keeps going", async () => {
    upsertListen
      .mockRejectedValueOnce(new Error("db hiccup"))
      .mockResolvedValueOnce({ created: true, track: { id: "a" } });
    await runWith([listen(), listen()]);
    expect(upsertListen).toHaveBeenCalledTimes(2);
    expect(terminal()).toMatchObject({
      status: "completed",
      accepted: 1,
      skipped: 1,
    });
  });

  it("writes progress every 25 listens and at the end", async () => {
    await runWith(Array.from({ length: 60 }, () => listen()));
    const progress = updates().filter(
      (d) => d.status === undefined && d.accepted !== undefined,
    );
    expect(progress.map((d) => d.accepted)).toEqual([25, 50, 60]);
  });

  it("completes an empty parse with zero counts", async () => {
    await runWith([]);
    expect(upsertListen).not.toHaveBeenCalled();
    expect(terminal()).toMatchObject({
      status: "completed",
      total: 0,
      accepted: 0,
      skipped: 0,
    });
  });

  it("enriches a track with mbids once per job", async () => {
    enrichment.trackNeedsEnrichment.mockResolvedValue(true);
    await runWith([
      listen({ recordingMbid: MBID }),
      listen({ recordingMbid: MBID }),
      listen({ trackName: "Other", artistMbids: [MBID] }),
    ]);
    expect(enrichment.trackNeedsEnrichment.mock.calls.map((c) => c[0])).toEqual([
      "track:T",
      "track:Other",
    ]);
    expect(enrichment.enqueueTrack.mock.calls.map((c) => c[0])).toEqual([
      "track:T",
      "track:Other",
    ]);
  });

  it("does not enqueue tracks that need no enrichment", async () => {
    await runWith([listen({ recordingMbid: MBID })]);
    expect(enrichment.trackNeedsEnrichment).toHaveBeenCalledOnce();
    expect(enrichment.enqueueTrack).not.toHaveBeenCalled();
  });

  it("does not check enrichment without any mbid", async () => {
    await runWith([listen({ artistMbids: [] })]);
    expect(enrichment.trackNeedsEnrichment).not.toHaveBeenCalled();
  });

  it("checks enrichment for re-imported duplicates", async () => {
    upsertListen.mockResolvedValueOnce({
      created: false,
      track: { id: "existing" },
    });
    enrichment.trackNeedsEnrichment.mockResolvedValue(true);
    await runWith([listen({ recordingMbid: MBID })]);
    expect(enrichment.enqueueTrack).toHaveBeenCalledWith("existing");
  });

  it("sweeps incomplete catalog entries after importing", async () => {
    await runWith([listen()]);
    expect(enrichment.enqueueIncompleteCatalog).toHaveBeenCalledWith(5000);
  });

  it("marks the job failed when the worker rejects", async () => {
    await runWith(new ImportParseError("corrupt file"));
    expect(upsertListen).not.toHaveBeenCalled();
    expect(terminal()).toMatchObject({
      status: "failed",
      lastError: "corrupt file",
      completedAt: expect.any(Date),
    });
  });

  it("truncates a long failure message", async () => {
    await runWith(new ImportParseError("x".repeat(2000)));
    expect(terminal()?.lastError).toHaveLength(500);
  });

  it("hides non-parse failure details from lastError", async () => {
    await runWith(new Error("ENOENT: open '/srv/secret/temp/x.json'"));
    expect(terminal()?.lastError).toBe("Import failed");
  });

  it("hides database failure details from lastError", async () => {
    update.mockRejectedValueOnce(
      new Error("Invalid invocation in /srv/app/dist/imports.service.js:1:1"),
    );
    await runWith([listen()]);
    expect(terminal()).toMatchObject({
      status: "failed",
      lastError: "Import failed",
    });
  });

  it("does not double count when the enrichment check fails", async () => {
    enrichment.trackNeedsEnrichment.mockRejectedValue(new Error("redis down"));
    await runWith([
      listen({ trackName: "One", recordingMbid: MBID }),
      listen({ trackName: "Two", recordingMbid: MBID }),
    ]);
    expect(terminal()).toMatchObject({
      status: "completed",
      total: 2,
      accepted: 2,
      skipped: 0,
    });
  });

  it("logs a rejected enrichment enqueue and completes", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    enrichment.trackNeedsEnrichment.mockResolvedValue(true);
    enrichment.enqueueTrack.mockRejectedValue(new Error("queue down"));
    await runWith([listen({ recordingMbid: MBID })]);
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("queue down")),
    );
    expect(terminal()).toMatchObject({ status: "completed", accepted: 1 });
    warn.mockRestore();
  });

  it("logs and cleans up when the failed status cannot be saved", async () => {
    const error = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    update.mockRejectedValue(new Error("db gone"));
    await runWith(new ImportParseError("bad file"));
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(expect.stringContaining("db gone")),
    );
    expect(existsSync(stagingDir())).toBe(false);
    error.mockRestore();
  });

  it("removes staged files after a failure", async () => {
    await runWith(new Error("boom"));
    expect(existsSync(stagingDir())).toBe(false);
  });

  it("returns to the caller before the job finishes", async () => {
    let release: (v: unknown[]) => void = () => {};
    state.parse.mockReturnValue(
      new Promise((r) => {
        release = r;
      }),
    );
    const res = await service.startImport(
      uploadPath,
      "upload.json",
      "u-1",
      "maloja_json",
    );
    expect(res.status).toBe("running");
    expect(terminal()).toBeUndefined();
    release([]);
    await vi.waitFor(() => expect(existsSync(stagingDir())).toBe(false));
    expect(terminal()).toMatchObject({ status: "completed" });
  });
});
