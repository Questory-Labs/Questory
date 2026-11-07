import { mkdtemp, readdir, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseListenBrainzZip } from "../../src/music/imports/parsers/listenbrainz";

const MBID = "11111111-2222-3333-4444-555555555555";
const MBID2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const line = (overrides: Record<string, unknown> = {}, meta = {}) =>
  JSON.stringify({
    listened_at: 1700000000,
    track_metadata: {
      artist_name: "Artist",
      track_name: "Song",
      release_name: "Album",
      ...meta,
    },
    ...overrides,
  });

const zip = (files: Record<string, string>) =>
  Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([name, body]) => [name, strToU8(body)]),
      ),
    ),
  );
const parseLines = (...lines: string[]) =>
  parseListenBrainzZip(zip({ "listens/2023/11.jsonl": lines.join("\n") }));

describe("parseListenBrainzZip mapping", () => {
  it("maps a listen with defaults and reads listened_at as seconds", () => {
    expect(parseLines(line())).toEqual([
      {
        artistName: "Artist",
        trackName: "Song",
        releaseName: "Album",
        listenedAt: new Date(1700000000 * 1000),
        recordingMbid: null,
        releaseMbid: null,
        artistMbids: undefined,
        durationMs: null,
        mediaPlayer: null,
        submissionClient: "listenbrainz_import",
        musicService: "listenbrainz",
      },
    ]);
  });

  it("passes through additional_info", () => {
    const [row] = parseLines(
      line(
        {},
        {
          additional_info: {
            artist_mbids: [MBID, "junk"],
            release_mbid: MBID2,
            recording_mbid: MBID,
            duration_ms: 1234,
            media_player: "Navidrome",
            submission_client: "multi-scrobbler",
            music_service: "spotify.com",
          },
        },
      ),
    );
    expect(row).toMatchObject({
      artistMbids: [MBID],
      releaseMbid: MBID2,
      recordingMbid: MBID,
      durationMs: 1234,
      mediaPlayer: "Navidrome",
      submissionClient: "multi-scrobbler",
      musicService: "spotify.com",
    });
  });

  it("falls back to mbid_mapping when additional_info lacks ids", () => {
    const [row] = parseLines(
      line(
        {},
        {
          mbid_mapping: {
            artist_mbids: [MBID2],
            release_mbid: MBID2,
            recording_mbid: MBID,
          },
        },
      ),
    );
    expect(row).toMatchObject({
      artistMbids: [MBID2],
      releaseMbid: MBID2,
      recordingMbid: MBID,
    });
  });

  it("prefers additional_info ids over mbid_mapping", () => {
    const [row] = parseLines(
      line(
        {},
        {
          additional_info: { recording_mbid: MBID, artist_mbids: [MBID] },
          mbid_mapping: { recording_mbid: MBID2, artist_mbids: [MBID2] },
        },
      ),
    );
    expect(row.recordingMbid).toBe(MBID);
    expect(row.artistMbids).toEqual([MBID]);
  });

  it("falls through a malformed additional_info id to the mapping", () => {
    const [row] = parseLines(
      line(
        {},
        {
          additional_info: { recording_mbid: "bad" },
          mbid_mapping: { recording_mbid: MBID },
        },
      ),
    );
    expect(row.recordingMbid).toBe(MBID);
  });

  it("prefers duration_ms and converts duration from seconds", () => {
    const duration = (info: Record<string, unknown>) =>
      parseLines(line({}, { additional_info: info }))[0].durationMs;
    expect(duration({ duration_ms: 500, duration: 9 })).toBe(500);
    expect(duration({ duration: 9 })).toBe(9000);
    expect(duration({ duration_ms: 0, duration: 9 })).toBe(9000);
    expect(duration({ duration_ms: -1 })).toBeNull();
    expect(duration({ duration: "9" })).toBeNull();
  });

  it("trims names and nulls a blank release", () => {
    const [row] = parseLines(
      line(
        {},
        { artist_name: " Artist ", track_name: " Song ", release_name: "  " },
      ),
    );
    expect(row).toMatchObject({
      artistName: "Artist",
      trackName: "Song",
      releaseName: null,
    });
  });

  it("preserves unicode", () => {
    const [row] = parseLines(
      line({}, { artist_name: "宇多田ヒカル", track_name: "First Love 💿" }),
    );
    expect(row.artistName).toBe("宇多田ヒカル");
    expect(row.trackName).toBe("First Love 💿");
  });
});

describe("parseListenBrainzZip line tolerance", () => {
  it("skips malformed lines and keeps the valid ones", () => {
    const rows = parseLines(line(), "{not json", '{"listened_at":', line());
    expect(rows).toHaveLength(2);
  });

  it("handles CRLF and blank lines", () => {
    const rows = parseListenBrainzZip(
      zip({ "listens/a.jsonl": `${line()}\r\n\r\n   \r\n${line()}\r\n` }),
    );
    expect(rows).toHaveLength(2);
  });

  it("skips lines missing names or metadata", () => {
    const rows = parseLines(
      line(),
      JSON.stringify({ listened_at: 1 }),
      line({}, { artist_name: " " }),
      line({}, { track_name: undefined }),
    );
    expect(rows).toHaveLength(1);
  });

  it.each(["1700000000", null])(
    "skips non-numeric listened_at %j",
    (listened_at) => {
      expect(parseLines(line(), line({ listened_at }))).toHaveLength(1);
    },
  );

  it("skips listened_at beyond the representable date range", () => {
    expect(parseLines(line(), line({ listened_at: 1e16 }))).toHaveLength(1);
  });

  it("keeps duplicates across lines for the catalog to dedupe", () => {
    expect(parseLines(line(), line())).toHaveLength(2);
  });
});

describe("parseListenBrainzZip archive handling", () => {
  it("reads nested listens files and ignores everything else", () => {
    const rows = parseListenBrainzZip(
      zip({
        "export/listens/2022/1.jsonl": line({}, { track_name: "A" }),
        "listens/2023/2.jsonl": line({}, { track_name: "B" }),
        "feedback/likes.jsonl": line({}, { track_name: "Feedback" }),
        "listens/readme.txt": line({}, { track_name: "Text" }),
        "user.json": "{}",
      }),
    );
    expect(rows.map((r) => r.trackName).sort()).toEqual(["A", "B"]);
  });

  it("accepts backslash separators in entry names", () => {
    const rows = parseListenBrainzZip(
      zip({ "listens\\2023\\1.jsonl": line() }),
    );
    expect(rows).toHaveLength(1);
  });

  it("rejects an archive without listens files", () => {
    expect(() =>
      parseListenBrainzZip(zip({ "user.json": "{}" })),
    ).toThrow(/no listens/);
  });

  it("rejects an archive whose listens are all invalid", () => {
    expect(() =>
      parseListenBrainzZip(zip({ "listens/a.jsonl": "{bad\n{}\n" })),
    ).toThrow(/no listens/);
  });

  it("rejects bytes that are not a zip", () => {
    expect(() => parseListenBrainzZip(Buffer.from("PK not really"))).toThrow();
    expect(() => parseListenBrainzZip(Buffer.alloc(0))).toThrow();
  });

  it("rejects a truncated zip", () => {
    const whole = zip({ "listens/a.jsonl": line() });
    expect(() =>
      parseListenBrainzZip(whole.subarray(0, Math.floor(whole.length / 2))),
    ).toThrow();
  });

  describe("traversal entries", () => {
    let dir: string;
    const originalCwd = process.cwd();

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "music-import-lb-"));
      process.chdir(dir);
    });

    afterEach(async () => {
      process.chdir(originalCwd);
      await rm(dir, { recursive: true, force: true });
    });

    it("reads traversal-named entries in memory without writing files", async () => {
      const rows = parseListenBrainzZip(
        zip({
          "../../listens/evil.jsonl": line(),
          "/etc/listens/evil.jsonl": line(),
        }),
      );
      expect(rows).toHaveLength(2);
      expect(await readdir(dir)).toEqual([]);
    });
  });
});
