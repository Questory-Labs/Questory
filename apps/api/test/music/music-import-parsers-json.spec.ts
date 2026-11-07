import { describe, expect, it } from "vitest";
import { parseKoitoJson } from "../../src/music/imports/parsers/koito-json";
import { parseMalojaJson } from "../../src/music/imports/parsers/maloja";
import { parseSpotifyJson } from "../../src/music/imports/parsers/spotify";
import {
  cleanMbid,
  primaryAlias,
} from "../../src/music/imports/parsers/types";

const MBID = "11111111-2222-3333-4444-555555555555";
const MBID2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("cleanMbid", () => {
  it("lowercases and trims valid ids", () => {
    expect(cleanMbid(`  ${MBID2.toUpperCase()} `)).toBe(MBID2);
  });

  it.each([null, undefined, 42, {}, "", "   ", "not-a-uuid", `${MBID}x`])(
    "rejects %j",
    (value) => {
      expect(cleanMbid(value)).toBeNull();
    },
  );
});

describe("primaryAlias", () => {
  it("prefers the primary alias and trims it", () => {
    expect(
      primaryAlias([
        { alias: "Other" },
        { alias: "  Main ", is_primary: true },
      ]),
    ).toBe("Main");
  });

  it("falls back past a blank primary to the first named alias", () => {
    expect(
      primaryAlias([{ alias: "  ", is_primary: true }, { alias: "Named" }]),
    ).toBe("Named");
  });

  it("returns empty for missing or blank aliases", () => {
    expect(primaryAlias(undefined)).toBe("");
    expect(primaryAlias([])).toBe("");
    expect(primaryAlias([{ alias: " " }, {}])).toBe("");
  });
});

describe("parseSpotifyJson", () => {
  const item = (overrides: Record<string, unknown> = {}) => ({
    ts: "2024-03-01T10:00:00Z",
    master_metadata_track_name: "Song",
    master_metadata_album_artist_name: "Artist",
    master_metadata_album_album_name: "Album",
    reason_end: "trackdone",
    ms_played: 180000,
    ...overrides,
  });
  const parse = (...items: unknown[]) =>
    parseSpotifyJson(JSON.stringify(items));

  it("maps a completed stream", () => {
    expect(parse(item())).toEqual([
      {
        artistName: "Artist",
        trackName: "Song",
        releaseName: "Album",
        listenedAt: new Date("2024-03-01T10:00:00Z"),
        durationMs: 180000,
        musicService: "spotify",
        submissionClient: "spotify_import",
      },
    ]);
  });

  it.each(["fwdbtn", "backbtn", "endplay", null, undefined])(
    "drops streams ending with %s",
    (reason_end) => {
      expect(parse(item({ reason_end }))).toEqual([]);
    },
  );

  it("drops podcasts with null track metadata", () => {
    expect(
      parse(
        item({
          master_metadata_track_name: null,
          master_metadata_album_artist_name: null,
        }),
      ),
    ).toEqual([]);
  });

  it("drops blank track or artist", () => {
    expect(parse(item({ master_metadata_track_name: "  " }))).toEqual([]);
    expect(parse(item({ master_metadata_album_artist_name: "" }))).toEqual([]);
  });

  it.each(["not-a-date", "2024-13-45T00:00:00Z", "", undefined])(
    "drops invalid timestamp %j",
    (ts) => {
      expect(parse(item({ ts }))).toEqual([]);
    },
  );

  it.each([0, -5, null, "180000"])(
    "stores null duration for ms_played %j",
    (ms_played) => {
      expect(parse(item({ ms_played }))[0].durationMs).toBeNull();
    },
  );

  it("trims names and nulls a blank album", () => {
    const [row] = parse(
      item({
        master_metadata_track_name: " Song ",
        master_metadata_album_artist_name: " Artist ",
        master_metadata_album_album_name: "  ",
      }),
    );
    expect(row).toMatchObject({
      trackName: "Song",
      artistName: "Artist",
      releaseName: null,
    });
  });

  it("preserves unicode", () => {
    const [row] = parse(
      item({
        master_metadata_track_name: "夜に駆ける",
        master_metadata_album_artist_name: "YOASOBI 🎵 Björk",
      }),
    );
    expect(row.trackName).toBe("夜に駆ける");
    expect(row.artistName).toBe("YOASOBI 🎵 Björk");
  });

  it("keeps duplicates for the catalog to dedupe", () => {
    expect(parse(item(), item())).toHaveLength(2);
  });

  it("keeps valid rows around invalid ones in order", () => {
    const rows = parse(
      item({ master_metadata_track_name: "First" }),
      item({ reason_end: "fwdbtn" }),
      item({ master_metadata_track_name: "Last" }),
    );
    expect(rows.map((r) => r.trackName)).toEqual(["First", "Last"]);
  });

  it("rejects non-array and malformed documents", () => {
    expect(() => parseSpotifyJson("{}")).toThrow(/must be a JSON array/);
    expect(() => parseSpotifyJson('[{"ts":')).toThrow(SyntaxError);
    expect(() => parseSpotifyJson("")).toThrow(SyntaxError);
  });

  it("returns nothing for an empty export", () => {
    expect(parseSpotifyJson("[]")).toEqual([]);
  });
});

describe("parseMalojaJson", () => {
  const scrobble = (overrides: Record<string, unknown> = {}) => ({
    time: 1700000000,
    track: {
      artists: ["Artist"],
      title: "Song",
      album: { albumtitle: "Album" },
      ...overrides,
    },
  });
  const parse = (...scrobbles: unknown[]) =>
    parseMalojaJson(JSON.stringify({ scrobbles }));

  it("maps a scrobble and reads time as seconds", () => {
    expect(parse(scrobble())).toEqual([
      {
        artistName: "Artist",
        trackName: "Song",
        releaseName: "Album",
        listenedAt: new Date(1700000000 * 1000),
        musicService: "maloja",
        submissionClient: "maloja_import",
      },
    ]);
  });

  it("promotes the bullet entry to find the main artist", () => {
    const [row] = parse(
      scrobble({ artists: ["Feature", "Main • Feature"] }),
    );
    expect(row.artistName).toBe("Main");
  });

  it("splits a lone bullet entry", () => {
    expect(parse(scrobble({ artists: ["Main • Other"] }))[0].artistName).toBe(
      "Main",
    );
  });

  it("does not split a bullet lacking surrounding spaces", () => {
    expect(parse(scrobble({ artists: ["A•B"] }))[0].artistName).toBe(
      "A•B",
    );
  });

  it("uses the first artist case-insensitively deduped", () => {
    expect(parse(scrobble({ artists: ["ARTIST", "artist"] }))[0].artistName).toBe(
      "ARTIST",
    );
  });

  it("skips blank artist entries to reach a named one", () => {
    expect(parse(scrobble({ artists: ["  ", "Real"] }))[0].artistName).toBe(
      "Real",
    );
  });

  it("drops rows with no usable artist or title", () => {
    expect(parse(scrobble({ artists: [] }))).toEqual([]);
    expect(parse(scrobble({ artists: ["   "] }))).toEqual([]);
    expect(parse(scrobble({ artists: "Artist" }))).toEqual([]);
    expect(parse(scrobble({ title: "  " }))).toEqual([]);
    expect(parse({ time: 1 })).toEqual([]);
  });

  it.each(["1700000000", null, undefined])(
    "drops non-numeric time %j",
    (time) => {
      expect(parse({ ...scrobble(), time })).toEqual([]);
    },
  );

  it("drops time beyond the representable date range", () => {
    expect(parse({ ...scrobble(), time: 1e16 })).toEqual([]);
  });

  it("nulls a missing or blank album", () => {
    expect(parse(scrobble({ album: undefined }))[0].releaseName).toBeNull();
    expect(
      parse(scrobble({ album: { albumtitle: " " } }))[0].releaseName,
    ).toBeNull();
  });

  it("preserves unicode and duplicates", () => {
    const row = scrobble({ artists: ["Sigur Rós"], title: "Hoppípolla" });
    const rows = parse(row, row);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      artistName: "Sigur Rós",
      trackName: "Hoppípolla",
    });
  });

  it("returns nothing when scrobbles is absent or not an array", () => {
    expect(parseMalojaJson("{}")).toEqual([]);
    expect(parseMalojaJson('{"scrobbles":"x"}')).toEqual([]);
    expect(parseMalojaJson("[]")).toEqual([]);
  });

  it("rejects truncated JSON", () => {
    expect(() => parseMalojaJson('{"scrobbles":[{')).toThrow(SyntaxError);
  });
});

describe("parseKoitoJson", () => {
  const listen = (overrides: Record<string, unknown> = {}) => ({
    listened_at: "2024-05-05T05:05:05Z",
    client: "navidrome",
    track: {
      mbid: MBID,
      duration: 200,
      aliases: [{ alias: "Song", is_primary: true }],
    },
    album: { mbid: MBID2, aliases: [{ alias: "Album", is_primary: true }] },
    artists: [{ mbid: MBID, aliases: [{ alias: "Artist", is_primary: true }] }],
    ...overrides,
  });
  const parse = (...listens: unknown[]) =>
    parseKoitoJson(JSON.stringify({ version: "1", listens }));

  it("maps a listen and converts seconds to ms", () => {
    expect(parse(listen())).toEqual([
      {
        artistName: "Artist",
        trackName: "Song",
        releaseName: "Album",
        listenedAt: new Date("2024-05-05T05:05:05Z"),
        recordingMbid: MBID,
        releaseMbid: MBID2,
        artistMbids: [MBID],
        durationMs: 200000,
        musicService: "navidrome",
        submissionClient: "koito_import",
      },
    ]);
  });

  it("accepts a missing version and rejects other versions", () => {
    expect(parseKoitoJson(JSON.stringify({ listens: [listen()] }))).toHaveLength(
      1,
    );
    expect(() =>
      parseKoitoJson(JSON.stringify({ version: "2", listens: [] })),
    ).toThrow("Unsupported Koito export version: 2");
  });

  it("picks the primary artist but keeps every valid artist mbid", () => {
    const [row] = parse(
      listen({
        artists: [
          { mbid: MBID, aliases: [{ alias: "Guest" }] },
          { mbid: MBID2, is_primary: true, aliases: [{ alias: "Main" }] },
          { mbid: "junk", aliases: [{ alias: "Third" }] },
        ],
      }),
    );
    expect(row.artistName).toBe("Main");
    expect(row.artistMbids).toEqual([MBID, MBID2]);
  });

  it("falls back to the first artist with no primary flag", () => {
    const [row] = parse(
      listen({
        artists: [
          { aliases: [{ alias: "First" }] },
          { aliases: [{ alias: "Second" }] },
        ],
      }),
    );
    expect(row.artistName).toBe("First");
    expect(row.artistMbids).toBeUndefined();
  });

  it("drops rows missing track alias, artist alias, or date", () => {
    expect(parse(listen({ track: undefined }))).toEqual([]);
    expect(parse(listen({ track: { aliases: [] } }))).toEqual([]);
    expect(parse(listen({ artists: [] }))).toEqual([]);
    expect(parse(listen({ artists: "x" }))).toEqual([]);
    expect(parse(listen({ listened_at: undefined }))).toEqual([]);
    expect(parse(listen({ listened_at: "yesterday-ish" }))).toEqual([]);
  });

  it("nulls absent optional fields and defaults the client", () => {
    const [row] = parse(
      listen({
        client: "  ",
        album: undefined,
        track: { mbid: "bad", aliases: [{ alias: "Song" }] },
      }),
    );
    expect(row).toMatchObject({
      releaseName: null,
      recordingMbid: null,
      releaseMbid: null,
      durationMs: null,
      musicService: "koito",
    });
  });

  it.each([0, -1, "200"])("nulls a non-positive duration %j", (duration) => {
    const [row] = parse(
      listen({ track: { duration, aliases: [{ alias: "Song" }] } }),
    );
    expect(row.durationMs).toBeNull();
  });

  it("preserves unicode aliases and duplicates", () => {
    const row = listen({
      track: { aliases: [{ alias: "紅蓮華" }] },
      artists: [{ aliases: [{ alias: "LiSA" }] }],
    });
    const rows = parse(row, row);
    expect(rows).toHaveLength(2);
    expect(rows[0].trackName).toBe("紅蓮華");
  });

  it("returns nothing when listens is absent or not an array", () => {
    expect(parseKoitoJson('{"version":"1"}')).toEqual([]);
    expect(parseKoitoJson('{"version":"1","listens":{}}')).toEqual([]);
  });

  it("rejects truncated JSON", () => {
    expect(() => parseKoitoJson('{"version":"1","listens":[')).toThrow(
      SyntaxError,
    );
  });
});
