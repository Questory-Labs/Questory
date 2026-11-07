import { mkdtemp, readdir, rm, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  parseKoitoDb,
  parseKoitoDbFile,
} from "../../src/music/imports/parsers/koito-db";

const MBID = "11111111-2222-3333-4444-555555555555";
const MBID2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const MBID3 = "99999999-8888-7777-6666-555555555555";

const SCHEMA = `
CREATE TABLE releases (id INTEGER PRIMARY KEY, musicbrainz_id TEXT);
CREATE TABLE release_aliases (release_id INTEGER, alias TEXT, is_primary INTEGER);
CREATE TABLE artists (id INTEGER PRIMARY KEY, musicbrainz_id TEXT);
CREATE TABLE artist_aliases (artist_id INTEGER, alias TEXT, is_primary INTEGER);
CREATE TABLE tracks (id INTEGER PRIMARY KEY, musicbrainz_id TEXT, duration INTEGER, release_id INTEGER);
CREATE TABLE track_aliases (track_id INTEGER, alias TEXT, is_primary INTEGER);
CREATE TABLE artist_tracks (artist_id INTEGER, track_id INTEGER, is_primary INTEGER);
CREATE TABLE listens (track_id INTEGER, listened_at, client TEXT);
`;

const SEED = `
INSERT INTO releases VALUES (1, '${MBID3}');
INSERT INTO release_aliases VALUES (1, 'Alt Album', 0), (1, 'Album', 1);
INSERT INTO artists VALUES (1, '${MBID2}'), (2, NULL);
INSERT INTO artist_aliases VALUES (1, 'Alt Artist', 0), (1, 'Artist', 1), (2, 'Guest', 1);
INSERT INTO tracks VALUES (1, '${MBID}', 200, 1);
INSERT INTO track_aliases VALUES (1, 'Alt Song', 0), (1, 'Song', 1);
INSERT INTO artist_tracks VALUES (2, 1, 0), (1, 1, 1);
`;

describe("koito db parser", () => {
  let dir: string;
  let path: string;

  const build = (sql: string, schema = SCHEMA) => {
    const db = new Database(path);
    db.exec(schema);
    db.exec(sql);
    db.close();
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "music-import-koito-"));
    path = join(dir, "koito.db");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("maps a listen using primary aliases and primary artist", () => {
    build(`${SEED} INSERT INTO listens VALUES (1, 1700000000, 'navidrome');`);
    expect(parseKoitoDbFile(path)).toEqual([
      {
        artistName: "Artist",
        trackName: "Song",
        releaseName: "Album",
        listenedAt: new Date(1700000000 * 1000),
        recordingMbid: MBID,
        releaseMbid: MBID3,
        artistMbids: [MBID2],
        durationMs: 200000,
        musicService: "navidrome",
        submissionClient: "koito_import",
      },
    ]);
  });

  it("orders listens by time ascending and keeps duplicates", () => {
    build(`${SEED}
      INSERT INTO listens VALUES (1, 1700000300, NULL), (1, 1700000100, NULL), (1, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path).map((r) => r.listenedAt.getTime())).toEqual([
      1700000100000, 1700000100000, 1700000300000,
    ]);
  });

  it("falls back to non-primary aliases", () => {
    build(`
      INSERT INTO releases VALUES (1, NULL);
      INSERT INTO release_aliases VALUES (1, 'Any Album', 0);
      INSERT INTO artists VALUES (1, NULL);
      INSERT INTO artist_aliases VALUES (1, 'Any Artist', 0);
      INSERT INTO tracks VALUES (1, NULL, NULL, 1);
      INSERT INTO track_aliases VALUES (1, 'Any Song', 0);
      INSERT INTO artist_tracks VALUES (1, 1, 0);
      INSERT INTO listens VALUES (1, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path)[0]).toMatchObject({
      artistName: "Any Artist",
      trackName: "Any Song",
      releaseName: "Any Album",
      recordingMbid: null,
      releaseMbid: null,
      artistMbids: undefined,
      durationMs: null,
      musicService: "koito",
    });
  });

  it("drops listens with no track alias or no artist", () => {
    build(`
      INSERT INTO artists VALUES (1, NULL);
      INSERT INTO artist_aliases VALUES (1, 'Artist', 1);
      INSERT INTO tracks VALUES (1, NULL, NULL, NULL), (2, NULL, NULL, NULL);
      INSERT INTO track_aliases VALUES (2, 'No Artist', 1);
      INSERT INTO artist_tracks VALUES (1, 1, 1);
      INSERT INTO listens VALUES (1, 1700000100, NULL), (2, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path)).toEqual([]);
  });

  it("drops listens pointing at an unknown track", () => {
    build(`${SEED} INSERT INTO listens VALUES (99, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path)).toEqual([]);
  });

  it("drops text timestamps, null timestamps, and out-of-range values", () => {
    build(`${SEED}
      INSERT INTO listens VALUES
        (1, '2024-01-01', NULL),
        (1, NULL, NULL),
        (1, 10000000000000000, NULL),
        (1, 0, NULL),
        (1, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path)).toHaveLength(1);
  });

  it("reads millisecond timestamps as the same instant", () => {
    build(`${SEED} INSERT INTO listens VALUES (1, 1700000000000, NULL);`);
    expect(parseKoitoDbFile(path)[0].listenedAt).toEqual(
      new Date(1700000000000),
    );
  });

  it("drops rows whose aliases or client are not text", () => {
    build(`${SEED}
      UPDATE track_aliases SET alias = x'00ff';
      INSERT INTO listens VALUES (1, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path)).toEqual([]);
  });

  it("nulls a non-positive duration and trims a blank client", () => {
    build(`${SEED}
      UPDATE tracks SET duration = 0;
      INSERT INTO listens VALUES (1, 1700000100, '   ');`);
    expect(parseKoitoDbFile(path)[0]).toMatchObject({
      durationMs: null,
      musicService: "koito",
    });
  });

  it("preserves unicode aliases", () => {
    build(`${SEED}
      UPDATE track_aliases SET alias = '残酷な天使のテーゼ' WHERE is_primary = 1;
      INSERT INTO listens VALUES (1, 1700000100, NULL);`);
    expect(parseKoitoDbFile(path)[0].trackName).toBe("残酷な天使のテーゼ");
  });

  it("returns nothing for an empty database", () => {
    build("");
    expect(parseKoitoDbFile(path)).toEqual([]);
  });

  it.each([
    "listens",
    "tracks",
    "track_aliases",
    "artists",
    "artist_aliases",
    "releases",
    "release_aliases",
    "artist_tracks",
  ])("rejects a database missing %s", (table) => {
    build(`DROP TABLE ${table};`);
    expect(() => parseKoitoDbFile(path)).toThrow(
      `Not a Koito database (missing table: ${table})`,
    );
  });

  it("rejects a sqlite database of another app", () => {
    build("", "CREATE TABLE notes (id INTEGER);");
    expect(() => parseKoitoDbFile(path)).toThrow(/Not a Koito database/);
  });

  it("rejects a missing file", () => {
    expect(() => parseKoitoDbFile(join(dir, "missing.db"))).toThrow();
  });

  it("rejects a file that is not sqlite", async () => {
    await writeFile(path, "definitely not sqlite, just some plain text bytes");
    expect(() => parseKoitoDbFile(path)).toThrow();
  });

  it("rejects a truncated database", async () => {
    build(`${SEED} INSERT INTO listens VALUES (1, 1700000100, NULL);`);
    const bytes = await readFile(path);
    await writeFile(path, bytes.subarray(0, 512));
    expect(() => parseKoitoDbFile(path)).toThrow();
  });

  it("opens read-only and leaves the file unchanged", async () => {
    build(`${SEED} INSERT INTO listens VALUES (1, 1700000100, NULL);`);
    const before = await readFile(path);
    parseKoitoDbFile(path);
    expect((await readFile(path)).equals(before)).toBe(true);
  });

  describe("parseKoitoDb buffers", () => {
    const originalTmp = process.env.TMPDIR;
    let scratch: string;

    beforeEach(async () => {
      scratch = await mkdtemp(join(tmpdir(), "music-import-koito-scratch-"));
      process.env.TMPDIR = scratch;
    });

    afterEach(async () => {
      if (originalTmp === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = originalTmp;
      await rm(scratch, { recursive: true, force: true });
    });

    it("parses a buffer and removes its temp dir", async () => {
      build(`${SEED} INSERT INTO listens VALUES (1, 1700000100, NULL);`);
      const rows = await parseKoitoDb(await readFile(path));
      expect(rows).toHaveLength(1);
      expect(await readdir(scratch)).toEqual([]);
    });

    it("removes its temp dir when parsing fails", async () => {
      await expect(parseKoitoDb(Buffer.from("garbage bytes"))).rejects.toThrow();
      expect(await readdir(scratch)).toEqual([]);
    });
  });
});
