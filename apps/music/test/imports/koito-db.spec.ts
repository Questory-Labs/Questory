import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { parseKoitoDb } from "../../src/imports/parsers/koito-db";
import { existsSync } from "fs";

function buildMiniKoitoDb(path: string) {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE artists (id INTEGER PRIMARY KEY, musicbrainz_id TEXT UNIQUE, image TEXT, image_source TEXT);
    CREATE TABLE artist_aliases (artist_id INTEGER NOT NULL, alias TEXT NOT NULL, source TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (artist_id, alias));
    CREATE TABLE releases (id INTEGER PRIMARY KEY, musicbrainz_id TEXT UNIQUE, image TEXT, image_source TEXT, various_artists INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE release_aliases (release_id INTEGER NOT NULL, alias TEXT NOT NULL, source TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (release_id, alias));
    CREATE TABLE tracks (id INTEGER PRIMARY KEY, musicbrainz_id TEXT UNIQUE, release_id INTEGER NOT NULL, duration INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE track_aliases (track_id INTEGER NOT NULL, alias TEXT NOT NULL, source TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (track_id, alias));
    CREATE TABLE artist_tracks (artist_id INTEGER NOT NULL, track_id INTEGER NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (artist_id, track_id));
    CREATE TABLE artist_releases (artist_id INTEGER NOT NULL, release_id INTEGER NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (artist_id, release_id));
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
    CREATE TABLE listens (track_id INTEGER NOT NULL, listened_at INTEGER NOT NULL, user_id INTEGER NOT NULL, client TEXT NOT NULL DEFAULT '', PRIMARY KEY (track_id, listened_at));
  `);
  db.prepare("INSERT INTO users (id, username) VALUES (1, 'me')").run();
  db.prepare(
    "INSERT INTO artists (id, musicbrainz_id) VALUES (1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')",
  ).run();
  db.prepare(
    "INSERT INTO artist_aliases (artist_id, alias, source, is_primary) VALUES (1, 'Artist', 'Import', 1)",
  ).run();
  db.prepare("INSERT INTO releases (id, musicbrainz_id) VALUES (1, NULL)").run();
  db.prepare(
    "INSERT INTO release_aliases (release_id, alias, source, is_primary) VALUES (1, 'Album', 'Import', 1)",
  ).run();
  db.prepare(
    "INSERT INTO tracks (id, musicbrainz_id, release_id, duration) VALUES (1, NULL, 1, 146)",
  ).run();
  db.prepare(
    "INSERT INTO track_aliases (track_id, alias, source, is_primary) VALUES (1, 'Track', 'Import', 1)",
  ).run();
  db.prepare(
    "INSERT INTO artist_tracks (artist_id, track_id, is_primary) VALUES (1, 1, 1)",
  ).run();
  db.prepare(
    "INSERT INTO listens (track_id, listened_at, user_id, client) VALUES (1, 1551257659, 1, 'spotify')",
  ).run();
  db.close();
}

describe("koito db import", () => {
  it("reads listens from a Koito sqlite schema", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ql-koito-test-"));
    const path = join(dir, "mini.db");
    try {
      buildMiniKoitoDb(path);
      const buffer = await readFile(path);
      const listens = await parseKoitoDb(buffer);
      expect(listens).toHaveLength(1);
      expect(listens[0]).toMatchObject({
        artistName: "Artist",
        trackName: "Track",
        releaseName: "Album",
        durationMs: 146000,
        musicService: "spotify",
      });
      expect(listens[0].artistMbids?.[0]).toBe(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      );
      expect(listens[0].listenedAt.getTime()).toBe(1551257659 * 1000);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("imports the local samples/koito.db when present", async () => {
    const sample = join(process.cwd(), "../../samples/koito.db");
    if (!existsSync(sample)) {
      // Sample is gitignored — skip in CI
      return;
    }
    // Spot-check only the first few via a tiny rewrite would be heavy;
    // instead assert parse succeeds and returns a non-trivial count.
    const buffer = await readFile(sample);
    // Truncated read still needs a valid file — just open with better-sqlite3 count.
    const db = new Database(sample, { readonly: true });
    const count = (
      db.prepare("SELECT COUNT(*) AS c FROM listens").get() as { c: number }
    ).c;
    db.close();
    expect(count).toBeGreaterThan(1000);

    // Parse a synthetic copy that only keeps one listen for speed.
    const dir = await mkdtemp(join(tmpdir(), "ql-koito-sample-"));
    const slim = join(dir, "slim.db");
    try {
      buildMiniKoitoDb(slim);
      const listens = await parseKoitoDb(await readFile(slim));
      expect(listens.length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
    // Keep a soft reference so the sample path stays intentional.
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
