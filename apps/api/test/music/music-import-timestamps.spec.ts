import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseKoitoDbFile } from "../../src/music/imports/parsers/koito-db";
import { parseKoitoJson } from "../../src/music/imports/parsers/koito-json";
import { parseLastFmJson } from "../../src/music/imports/parsers/lastfm";
import { parseListenBrainzZip } from "../../src/music/imports/parsers/listenbrainz";
import { parseMalojaJson } from "../../src/music/imports/parsers/maloja";
import { parseSpotifyJson } from "../../src/music/imports/parsers/spotify";
import { parseListenedAt } from "../../src/music/imports/parsers/types";

const SECONDS = 1700000000;
const INSTANT = new Date(SECONDS * 1000);
const DAY = 24 * 60 * 60 * 1000;

describe("parseListenedAt", () => {
  it("reads seconds and milliseconds as the same instant", () => {
    expect(parseListenedAt(SECONDS)).toEqual(INSTANT);
    expect(parseListenedAt(SECONDS * 1000)).toEqual(INSTANT);
  });

  it("parses date strings", () => {
    expect(parseListenedAt("2023-11-14T22:13:20Z")).toEqual(INSTANT);
  });

  it.each([
    ["zero", 0],
    ["negative", -SECONDS],
    ["before 2000 in seconds", Date.UTC(1999, 11, 31) / 1000],
    ["before 2000 in ms", Date.UTC(1999, 11, 31)],
    ["microseconds", SECONDS * 1e6],
    ["seconds in the far future", 1e10],
    ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
    ["1970 string", "1970-01-01T00:00:00Z"],
    ["far future string", "2999-01-01T00:00:00Z"],
    ["garbage string", "soon"],
    ["empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["object", {}],
    ["boolean", true],
  ])("rejects %s", (_label, value) => {
    expect(parseListenedAt(value)).toBeNull();
  });

  it("accepts the lower bound", () => {
    expect(parseListenedAt(Date.UTC(2000, 0, 1))).toEqual(
      new Date(Date.UTC(2000, 0, 1)),
    );
  });

  it("allows a small clock skew but not more than a day", () => {
    expect(parseListenedAt(Date.now() + DAY / 2)).not.toBeNull();
    expect(parseListenedAt(Date.now() + DAY * 2)).toBeNull();
  });
});

describe("parsers share the timestamp rules", () => {
  const maloja = (time: unknown) =>
    parseMalojaJson(
      JSON.stringify({
        scrobbles: [{ time, track: { artists: ["A"], title: "T" } }],
      }),
    );
  const lastfm = (uts: string) =>
    parseLastFmJson(
      JSON.stringify([
        { track: [{ name: "T", artist: { "#text": "A" }, date: { uts } }] },
      ]),
    );
  const lastfmText = (text: string) =>
    parseLastFmJson(
      JSON.stringify([
        {
          track: [
            { name: "T", artist: { "#text": "A" }, date: { "#text": text } },
          ],
        },
      ]),
    );
  const listenbrainz = (listened_at: unknown) =>
    parseListenBrainzZip(
      Buffer.from(
        zipSync({
          "listens/a.jsonl": strToU8(
            `${JSON.stringify({
              listened_at: SECONDS,
              track_metadata: { artist_name: "Keep", track_name: "Keep" },
            })}\n${JSON.stringify({
              listened_at,
              track_metadata: { artist_name: "A", track_name: "T" },
            })}`,
          ),
        }),
      ),
    ).filter((row) => row.artistName === "A");
  const spotify = (ts: string) =>
    parseSpotifyJson(
      JSON.stringify([
        {
          ts,
          reason_end: "trackdone",
          master_metadata_track_name: "T",
          master_metadata_album_artist_name: "A",
        },
      ]),
    );
  const koito = (listened_at: string) =>
    parseKoitoJson(
      JSON.stringify({
        listens: [
          {
            listened_at,
            track: { aliases: [{ alias: "T" }] },
            artists: [{ aliases: [{ alias: "A" }] }],
          },
        ],
      }),
    );
  const koitoDb = async (listenedAt: number) => {
    const dir = await mkdtemp(join(tmpdir(), "music-import-ts-"));
    try {
      const path = join(dir, "k.db");
      const db = new Database(path);
      db.exec(`
        CREATE TABLE releases (id INTEGER PRIMARY KEY, musicbrainz_id TEXT);
        CREATE TABLE release_aliases (release_id INTEGER, alias TEXT, is_primary INTEGER);
        CREATE TABLE artists (id INTEGER PRIMARY KEY, musicbrainz_id TEXT);
        CREATE TABLE artist_aliases (artist_id INTEGER, alias TEXT, is_primary INTEGER);
        CREATE TABLE tracks (id INTEGER PRIMARY KEY, musicbrainz_id TEXT, duration INTEGER, release_id INTEGER);
        CREATE TABLE track_aliases (track_id INTEGER, alias TEXT, is_primary INTEGER);
        CREATE TABLE artist_tracks (artist_id INTEGER, track_id INTEGER, is_primary INTEGER);
        CREATE TABLE listens (track_id INTEGER, listened_at, client TEXT);
        INSERT INTO artists VALUES (1, NULL);
        INSERT INTO artist_aliases VALUES (1, 'A', 1);
        INSERT INTO tracks VALUES (1, NULL, NULL, NULL);
        INSERT INTO track_aliases VALUES (1, 'T', 1);
        INSERT INTO artist_tracks VALUES (1, 1, 1);
        INSERT INTO listens VALUES (1, ${listenedAt}, NULL);`);
      db.close();
      return parseKoitoDbFile(path);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };

  it("maloja reads ms and drops zero and future values", () => {
    expect(maloja(SECONDS * 1000)[0].listenedAt).toEqual(INSTANT);
    expect(maloja(0)).toEqual([]);
    expect(maloja(1e10)).toEqual([]);
  });

  it("listenbrainz reads ms and drops zero and future values", () => {
    expect(listenbrainz(SECONDS * 1000)[0].listenedAt).toEqual(INSTANT);
    expect(listenbrainz(0)).toEqual([]);
    expect(listenbrainz(1e10)).toEqual([]);
  });

  it("last.fm reads ms and drops zero and future values", () => {
    expect(lastfm(String(SECONDS * 1000))[0].listenedAt).toEqual(INSTANT);
    expect(lastfm("0")).toEqual([]);
    expect(lastfm("10000000000")).toEqual([]);
  });

  it("last.fm date text obeys the bounds", () => {
    expect(lastfmText("01 Jan 1970, 00:00")).toEqual([]);
    expect(lastfmText("01 Jan 2999, 00:00")).toEqual([]);
  });

  it("koito db reads ms and drops zero and future values", async () => {
    expect((await koitoDb(SECONDS * 1000))[0].listenedAt).toEqual(INSTANT);
    expect(await koitoDb(0)).toEqual([]);
    expect(await koitoDb(1e10)).toEqual([]);
  });

  it("spotify and koito json drop implausible date strings", () => {
    for (const parse of [spotify, koito]) {
      expect(parse("2023-11-14T22:13:20Z")[0].listenedAt).toEqual(INSTANT);
      expect(parse("1970-01-01T00:00:00Z")).toEqual([]);
      expect(parse("2999-01-01T00:00:00Z")).toEqual([]);
    }
  });
});
