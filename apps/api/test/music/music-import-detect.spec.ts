import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectImportSource,
  detectImportSourceFromPath,
} from "../../src/music/imports/parsers/detect";

const SQLITE = Buffer.concat([
  Buffer.from("SQLite format 3\0"),
  Buffer.alloc(32),
]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]);
const json = (value: unknown) => Buffer.from(JSON.stringify(value));

const spotifyDoc = json([
  { ts: "2024-01-01T00:00:00Z", master_metadata_track_name: "A", ms_played: 1 },
]);
const malojaDoc = json({ scrobbles: [{ time: 1, track: { title: "A" } }] });
const koitoDoc = json({ version: "1", listens: [] });
const lastfmDoc = json([{ track: [{ name: "A", artist: { "#text": "B" } }] }]);

describe("detectImportSource filename hints", () => {
  it.each([
    ["Streaming_History_Audio_2020.json", "spotify_json"],
    ["STREAMING_HISTORY_AUDIO_2021_3.JSON", "spotify_json"],
    ["my-maloja-backup.json", "maloja_json"],
    ["MALOJA.JSON", "maloja_json"],
    ["user_recenttracks_2020.json", "lastfm_json"],
    ["RecentTracks.json", "lastfm_json"],
    ["listenbrainz_me.zip", "listenbrainz_zip"],
    ["koito_export.json", "koito_json"],
    ["KOITO.JSON", "koito_json"],
  ])("maps %s to %s without inspecting content", (name, expected) => {
    expect(detectImportSource(name, Buffer.alloc(0))).toBe(expected);
  });

  it("prefers the filename over conflicting JSON content", () => {
    expect(detectImportSource("maloja.json", spotifyDoc)).toBe("maloja_json");
    expect(detectImportSource("recenttracks.json", malojaDoc)).toBe(
      "lastfm_json",
    );
    expect(detectImportSource("Streaming_History_Audio.json", koitoDoc)).toBe(
      "spotify_json",
    );
  });

  it("detects a listenbrainz file without zip extension from zip magic", () => {
    expect(detectImportSource("listenbrainz-export", ZIP)).toBe(
      "listenbrainz_zip",
    );
  });

  it("does not trust a listenbrainz name for non-zip unknown content", () => {
    expect(() =>
      detectImportSource("listenbrainz.txt", Buffer.from("hello")),
    ).toThrow(/Unrecognized import file/);
  });

  it.each(["koito.db", "data.sqlite", "data.sqlite3", "koito-backup"])(
    "requires sqlite magic for %s",
    (name) => {
      expect(detectImportSource(name, SQLITE)).toBe("koito_db");
      expect(() => detectImportSource(name, Buffer.from("not sqlite"))).toThrow(
        /Unrecognized import file/,
      );
    },
  );

  it("falls through to content sniffing for a .db holding JSON", () => {
    expect(detectImportSource("export.db", spotifyDoc)).toBe("spotify_json");
  });
});

describe("detectImportSource magic bytes", () => {
  it("detects sqlite under any name", () => {
    expect(detectImportSource("upload.bin", SQLITE)).toBe("koito_db");
  });

  it("detects zip under any name", () => {
    expect(detectImportSource("upload.bin", ZIP)).toBe("listenbrainz_zip");
  });

  it("rejects truncated sqlite magic", () => {
    expect(() =>
      detectImportSource("upload.bin", Buffer.from("SQLite format")),
    ).toThrow(/Unrecognized import file/);
  });

  it("rejects a single byte of zip magic", () => {
    expect(() =>
      detectImportSource("upload.bin", Buffer.from([0x50])),
    ).toThrow(/Unrecognized import file/);
  });
});

describe("detectImportSource JSON sniffing", () => {
  it.each([
    ["spotify track key", spotifyDoc, "spotify_json"],
    ["maloja scrobbles", malojaDoc, "maloja_json"],
    ["koito version and listens", koitoDoc, "koito_json"],
    ["last.fm pages", lastfmDoc, "lastfm_json"],
    ["last.fm recenttracks wrapper", json({ recenttracks: {} }), "lastfm_json"],
  ])("recognises %s", (_label, body, expected) => {
    expect(detectImportSource("upload.json", body)).toBe(expected);
  });

  it("recognises spotify by ms_played alone", () => {
    expect(detectImportSource("a.json", json([{ ms_played: 3 }]))).toBe(
      "spotify_json",
    );
  });

  it("tolerates leading whitespace before JSON", () => {
    const body = Buffer.concat([Buffer.from("\n\t  "), malojaDoc]);
    expect(detectImportSource("upload.json", body)).toBe("maloja_json");
  });

  it("does not read listens without version as koito", () => {
    expect(() =>
      detectImportSource("upload.json", json({ listens: [] })),
    ).toThrow(/Unrecognized import file/);
  });

  it("does not read version without listens as koito", () => {
    expect(() =>
      detectImportSource("upload.json", json({ version: "1" })),
    ).toThrow(/Unrecognized import file/);
  });

  it("requires #text alongside track for last.fm", () => {
    expect(() =>
      detectImportSource("upload.json", json([{ track: [] }])),
    ).toThrow(/Unrecognized import file/);
  });

  it("does not sniff keywords in non-JSON text", () => {
    expect(() =>
      detectImportSource("notes.txt", Buffer.from('ms_played "scrobbles"')),
    ).toThrow(/Unrecognized import file/);
  });

  it("sniffs keys, not string values that look like other formats", () => {
    const koito = (alias: string) =>
      json({
        version: "1",
        listens: [{ track: { aliases: [{ alias }] } }],
      });
    expect(detectImportSource("a.json", koito('"scrobbles"'))).toBe(
      "koito_json",
    );
    expect(detectImportSource("a.json", koito('"scrobbles":'))).toBe(
      "koito_json",
    );
    expect(detectImportSource("a.json", koito("ms_played"))).toBe("koito_json");
    expect(detectImportSource("a.json", koito("recenttracks"))).toBe(
      "koito_json",
    );
  });

  it("does not read a title as a Spotify key in last.fm data", () => {
    const body = json([
      { track: [{ name: "ms_played", artist: { "#text": "A" } }] },
    ]);
    expect(detectImportSource("a.json", body)).toBe("lastfm_json");
  });

  it("requires maloja and koito keys at the document root", () => {
    expect(() =>
      detectImportSource("a.json", json({ meta: { scrobbles: [] } })),
    ).toThrow(/Unrecognized import file/);
    expect(() =>
      detectImportSource(
        "a.json",
        json({ meta: { version: "1", listens: [] } }),
      ),
    ).toThrow(/Unrecognized import file/);
  });

  it("detects a file starting with a UTF-8 BOM", () => {
    const body = Buffer.concat([Buffer.from("\uFEFF"), malojaDoc]);
    expect(detectImportSource("a.json", body)).toBe("maloja_json");
  });

  it("stops cleanly on a sample cut inside a string", () => {
    expect(() =>
      detectImportSource("a.json", Buffer.from('{"scrobbles')),
    ).toThrow(/Unrecognized import file/);
  });

  it("rejects an empty buffer and JSON with no known keys", () => {
    expect(() => detectImportSource("a.json", Buffer.alloc(0))).toThrow(
      /Unrecognized import file/,
    );
    expect(() => detectImportSource("a.json", Buffer.from("{}"))).toThrow(
      /Unrecognized import file/,
    );
  });

  it("names every supported format in the rejection", () => {
    expect(() => detectImportSource("a.bin", Buffer.from("x"))).toThrow(
      /Koito.*Spotify.*Maloja.*Last\.fm.*ListenBrainz/,
    );
  });
});

describe("detectImportSourceFromPath", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "music-import-detect-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("detects from the file content on disk", async () => {
    const path = join(dir, "upload.bin");
    await writeFile(path, SQLITE);
    await expect(detectImportSourceFromPath("upload.bin", path)).resolves.toBe(
      "koito_db",
    );
  });

  it("sniffs a marker inside the 8 KiB window", async () => {
    const path = join(dir, "upload.json");
    const padded = `{"pad":"${"x".repeat(8000)}","scrobbles":[]}`;
    await writeFile(path, padded);
    await expect(detectImportSourceFromPath("upload.json", path)).resolves.toBe(
      "maloja_json",
    );
  });

  it("ignores a marker past the 8 KiB window", async () => {
    const path = join(dir, "upload.json");
    await writeFile(path, `{"pad":"${"x".repeat(9000)}","scrobbles":[]}`);
    await expect(
      detectImportSourceFromPath("upload.json", path),
    ).rejects.toThrow(/Unrecognized import file/);
  });

  it("rejects an empty file", async () => {
    const path = join(dir, "empty.json");
    await writeFile(path, "");
    await expect(
      detectImportSourceFromPath("empty.json", path),
    ).rejects.toThrow(/Unrecognized import file/);
  });

  it("rejects a missing file", async () => {
    await expect(
      detectImportSourceFromPath("a.json", join(dir, "missing.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
