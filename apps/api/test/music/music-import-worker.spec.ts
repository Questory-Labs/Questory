import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeWorker extends EventEmitter {
  static instances: FakeWorker[] = [];
  terminate = vi.fn().mockResolvedValue(0);
  constructor(
    public file: string,
    public options: { workerData: unknown; resourceLimits?: unknown },
  ) {
    super();
    FakeWorker.instances.push(this);
  }
}

const post = vi.fn();
const state = vi.hoisted(() => ({
  parentPort: null as null | { postMessage: unknown },
  workerData: null as unknown,
}));

vi.mock("node:worker_threads", () => ({
  get Worker() {
    return FakeWorker;
  },
  get parentPort() {
    return state.parentPort;
  },
  get workerData() {
    return state.workerData;
  },
}));

import { parseImportInWorker } from "../../src/music/imports/parse-in-worker";
import { ImportParseError } from "../../src/music/imports/parsers/types";

const settled = async <T>(p: Promise<T>) => {
  const marker = Symbol("pending");
  const winner = await Promise.race([
    p.then(
      () => "settled",
      () => "settled",
    ),
    new Promise((r) => setTimeout(() => r(marker), 5)),
  ]);
  return winner !== marker;
};

describe("parseImportInWorker", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
  });

  const start = () => {
    const promise = parseImportInWorker("spotify_json", "/staged/a.json");
    return { promise, worker: FakeWorker.instances[0] };
  };

  it("starts the compiled worker with source, path and a heap limit", () => {
    const { worker, promise } = start();
    expect(worker.file.endsWith("parse-worker.js")).toBe(true);
    expect(worker.options).toEqual({
      workerData: { source: "spotify_json", stagedPath: "/staged/a.json" },
      resourceLimits: { maxOldGenerationSizeMb: 2048 },
    });
    worker.emit("message", { ok: true, listens: [] });
    return promise;
  });

  it("revives listen dates from ISO strings", async () => {
    const { worker, promise } = start();
    worker.emit("message", {
      ok: true,
      listens: [
        {
          artistName: "A",
          trackName: "T",
          listenedAt: "2024-01-02T03:04:05.000Z",
        },
      ],
    });
    await expect(promise).resolves.toEqual([
      {
        artistName: "A",
        trackName: "T",
        listenedAt: new Date("2024-01-02T03:04:05.000Z"),
      },
    ]);
  });

  it("rejects with the worker error and terminates it", async () => {
    const { worker, promise } = start();
    worker.emit("message", { ok: false, error: "bad file" });
    await expect(promise).rejects.toThrow("bad file");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("uses a generic message for an empty worker error", async () => {
    const { worker, promise } = start();
    worker.emit("message", { ok: false, error: "" });
    await expect(promise).rejects.toThrow("Parse failed");
  });

  it.each([null, "text", 7, {}])("rejects invalid response %j", async (msg) => {
    const { worker, promise } = start();
    worker.emit("message", msg);
    await expect(promise).rejects.toThrow("Invalid parse worker response");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("rejects on a worker error event", async () => {
    const { worker, promise } = start();
    worker.emit("error", new Error("oom"));
    await expect(promise).rejects.toThrow("oom");
  });

  it("rejects on a non-zero exit", async () => {
    const { worker, promise } = start();
    worker.emit("exit", 3);
    await expect(promise).rejects.toThrow("Parse worker exited with code 3");
  });

  it("rejects when the worker exits cleanly without a result", async () => {
    const { worker, promise } = start();
    worker.emit("exit", 0);
    await expect(promise).rejects.toThrow(
      "Parse worker exited without a result",
    );
  });

  it("does not fail after a result when the worker exits cleanly", async () => {
    const { worker, promise } = start();
    worker.emit("message", { ok: true, listens: [] });
    worker.emit("exit", 0);
    await expect(promise).resolves.toEqual([]);
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it("reports hitting the heap limit as a parse error", async () => {
    const { worker, promise } = start();
    worker.emit(
      "error",
      Object.assign(new Error("reached memory limit"), {
        code: "ERR_WORKER_OUT_OF_MEMORY",
      }),
    );
    const err = await promise.catch((e) => e);
    expect(err).toBeInstanceOf(ImportParseError);
    expect(err.message).toBe("Import file is too large to parse");
  });

  it("marks worker-reported failures as parse errors only", async () => {
    const reported = start();
    reported.worker.emit("message", { ok: false, error: "bad file" });
    await expect(reported.promise).rejects.toBeInstanceOf(ImportParseError);
    FakeWorker.instances = [];
    const crashed = start();
    crashed.worker.emit("error", new Error("Cannot find module /abs/x.js"));
    const err = await crashed.promise.catch((e) => e);
    expect(err).not.toBeInstanceOf(ImportParseError);
  });

  it("survives a rejected terminate", async () => {
    const { worker, promise } = start();
    worker.terminate.mockRejectedValueOnce(new Error("gone"));
    worker.emit("error", new Error("oom"));
    await expect(promise).rejects.toThrow("oom");
  });

  it("keeps the first result when later events arrive", async () => {
    const { worker, promise } = start();
    worker.emit("message", { ok: true, listens: [] });
    worker.emit("error", new Error("late"));
    worker.emit("exit", 1);
    await expect(promise).resolves.toEqual([]);
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it("stays pending until the worker responds", async () => {
    const { worker, promise } = start();
    expect(await settled(promise)).toBe(false);
    worker.emit("message", { ok: true, listens: [] });
    expect(await settled(promise)).toBe(true);
  });
});

describe("parse-worker entrypoint", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "music-import-worker-"));
    post.mockReset();
    state.parentPort = { postMessage: post };
    vi.resetModules();
  });

  afterEach(async () => {
    state.parentPort = null;
    state.workerData = null;
    await rm(dir, { recursive: true, force: true });
  });

  const run = async (source: string, stagedPath: string) => {
    state.workerData = { source, stagedPath };
    await import("../../src/music/imports/parse-worker");
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    return post.mock.calls[0][0];
  };

  const stage = async (name: string, body: string | Uint8Array) => {
    const path = join(dir, name);
    await writeFile(path, body);
    return path;
  };

  const lbLine = JSON.stringify({
    listened_at: 1700000000,
    track_metadata: { artist_name: "A", track_name: "T" },
  });

  it.each([
    [
      "spotify_json",
      () =>
        JSON.stringify([
          {
            ts: "2023-11-14T22:13:20.000Z",
            reason_end: "trackdone",
            master_metadata_track_name: "T",
            master_metadata_album_artist_name: "A",
          },
        ]),
    ],
    [
      "maloja_json",
      () =>
        JSON.stringify({
          scrobbles: [{ time: 1700000000, track: { artists: ["A"], title: "T" } }],
        }),
    ],
    [
      "lastfm_json",
      () =>
        JSON.stringify([
          {
            track: [
              { name: "T", artist: { "#text": "A" }, date: { uts: "1700000000" } },
            ],
          },
        ]),
    ],
    [
      "koito_json",
      () =>
        JSON.stringify({
          version: "1",
          listens: [
            {
              listened_at: "2023-11-14T22:13:20.000Z",
              track: { aliases: [{ alias: "T" }] },
              artists: [{ aliases: [{ alias: "A" }] }],
            },
          ],
        }),
    ],
    [
      "listenbrainz_zip",
      () => zipSync({ "listens/a.jsonl": strToU8(lbLine) }),
    ],
  ])("routes %s and serializes dates", async (source, body) => {
    const msg = await run(source, await stage("upload", body()));
    expect(msg.ok).toBe(true);
    expect(msg.listens).toHaveLength(1);
    expect(msg.listens[0]).toMatchObject({
      artistName: "A",
      trackName: "T",
      listenedAt: "2023-11-14T22:13:20.000Z",
    });
  });

  it("routes koito_db to the sqlite parser", async () => {
    const path = join(dir, "koito.db");
    const db = new Database(path);
    db.exec(`
      CREATE TABLE releases (id INTEGER PRIMARY KEY, musicbrainz_id TEXT);
      CREATE TABLE release_aliases (release_id INTEGER, alias TEXT, is_primary INTEGER);
      CREATE TABLE artists (id INTEGER PRIMARY KEY, musicbrainz_id TEXT);
      CREATE TABLE artist_aliases (artist_id INTEGER, alias TEXT, is_primary INTEGER);
      CREATE TABLE tracks (id INTEGER PRIMARY KEY, musicbrainz_id TEXT, duration INTEGER, release_id INTEGER);
      CREATE TABLE track_aliases (track_id INTEGER, alias TEXT, is_primary INTEGER);
      CREATE TABLE artist_tracks (artist_id INTEGER, track_id INTEGER, is_primary INTEGER);
      CREATE TABLE listens (track_id INTEGER, listened_at INTEGER, client TEXT);
      INSERT INTO artists VALUES (1, NULL);
      INSERT INTO artist_aliases VALUES (1, 'A', 1);
      INSERT INTO tracks VALUES (1, NULL, NULL, NULL);
      INSERT INTO track_aliases VALUES (1, 'T', 1);
      INSERT INTO artist_tracks VALUES (1, 1, 1);
      INSERT INTO listens VALUES (1, 1700000000, NULL);`);
    db.close();
    const msg = await run("koito_db", path);
    expect(msg.listens[0].listenedAt).toBe("2023-11-14T22:13:20.000Z");
  });

  it("reports a parse failure as a message", async () => {
    const msg = await run("spotify_json", await stage("bad.json", "{"));
    expect(msg.ok).toBe(false);
    expect(typeof msg.error).toBe("string");
  });

  it("reports a missing staged file without its path", async () => {
    const msg = await run("maloja_json", join(dir, "missing.json"));
    expect(msg).toEqual({
      ok: false,
      error: "Failed to read the import file",
    });
  });

  it.each([
    ["spotify_json", "Streaming.json", '[{"ts":"2023-11-14T22:13:20Z","reason_end":"trackdone","master_metadata_track_name":"T","master_metadata_album_artist_name":"A"}]'],
    ["maloja_json", "m.json", '{"scrobbles":[{"time":1700000000,"track":{"artists":["A"],"title":"T"}}]}'],
    ["lastfm_json", "l.json", '[{"track":[{"name":"T","artist":{"#text":"A"},"date":{"uts":"1700000000"}}]}]'],
    ["koito_json", "k.json", '{"version":"1","listens":[{"listened_at":"2023-11-14T22:13:20Z","track":{"aliases":[{"alias":"T"}]},"artists":[{"aliases":[{"alias":"A"}]}]}]}'],
  ])("parses %s with a UTF-8 BOM", async (source, name, body) => {
    const msg = await run(source, await stage(name, `\uFEFF${body}`));
    expect(msg.ok).toBe(true);
    expect(msg.listens).toHaveLength(1);
  });

  it("rejects an unsupported source", async () => {
    const msg = await run("evil", join(dir, "x"));
    expect(msg).toEqual({ ok: false, error: "Unsupported source: evil" });
  });

  it("posts nothing when run outside a worker thread", async () => {
    state.parentPort = null;
    state.workerData = { source: "spotify_json", stagedPath: "/none" };
    await import("../../src/music/imports/parse-worker");
    await new Promise((r) => setTimeout(r, 10));
    expect(post).not.toHaveBeenCalled();
  });
});
