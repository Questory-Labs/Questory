import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseKoitoJson } from "../../src/music/imports/parsers/koito-json";
import { parseLastFmJson } from "../../src/music/imports/parsers/lastfm";
import { parseListenBrainzZip } from "../../src/music/imports/parsers/listenbrainz";
import { parseMalojaJson } from "../../src/music/imports/parsers/maloja";
import { parseSpotifyJson } from "../../src/music/imports/parsers/spotify";
import { primaryAlias } from "../../src/music/imports/parsers/types";

const MBID = "11111111-2222-3333-4444-555555555555";
const MBID2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("malformed rows are skipped, not fatal", () => {
  const good = {
    ts: "2023-11-14T22:13:20Z",
    reason_end: "trackdone",
    master_metadata_track_name: "T",
    master_metadata_album_artist_name: "A",
  };

  it.each([
    [null],
    [7],
    ["text"],
    [[]],
    [{ ...good, master_metadata_track_name: 5 }],
    [{ ...good, master_metadata_album_artist_name: {} }],
    [{ ...good, ts: {} }],
  ])("spotify skips %j", (row) => {
    expect(parseSpotifyJson(JSON.stringify([row, good]))).toHaveLength(1);
  });

  it("spotify nulls a non-string album", () => {
    const [row] = parseSpotifyJson(
      JSON.stringify([{ ...good, master_metadata_album_album_name: 9 }]),
    );
    expect(row.releaseName).toBeNull();
  });

  const lastfmTrack = {
    name: "T",
    artist: { "#text": "A" },
    date: { uts: "1700000000" },
  };

  it.each([
    [null],
    [7],
    ["text"],
    [{ ...lastfmTrack, name: 5 }],
    [{ ...lastfmTrack, artist: { "#text": 1 } }],
    [{ ...lastfmTrack, date: { "#text": 12 } }],
  ])("last.fm skips track %j", (row) => {
    const rows = parseLastFmJson(
      JSON.stringify([{ track: [row, lastfmTrack] }]),
    );
    expect(rows).toHaveLength(1);
  });

  it.each([[null], [7], ["text"], [{ track: 7 }], [{ track: "x" }]])(
    "last.fm skips page %j",
    (page) => {
      const rows = parseLastFmJson(
        JSON.stringify([page, { track: [lastfmTrack] }]),
      );
      expect(rows).toHaveLength(1);
    },
  );

  it("last.fm reads a page whose track is a single object", () => {
    const rows = parseLastFmJson(JSON.stringify([{ track: lastfmTrack }]));
    expect(rows.map((r) => r.trackName)).toEqual(["T"]);
  });

  const scrobble = (track: unknown) => ({ time: 1700000000, track });

  it.each([
    [null],
    [7],
    [scrobble(null)],
    [scrobble("text")],
    [scrobble({ artists: [1, null, {}], title: "T" })],
    [scrobble({ artists: ["A"], title: 5 })],
  ])("maloja skips %j", (row) => {
    const rows = parseMalojaJson(
      JSON.stringify({
        scrobbles: [row, scrobble({ artists: ["A"], title: "T" })],
      }),
    );
    expect(rows).toHaveLength(1);
  });

  it("maloja keeps string artists beside non-string ones", () => {
    const [row] = parseMalojaJson(
      JSON.stringify({
        scrobbles: [scrobble({ artists: [1, "Real"], title: "T" })],
      }),
    );
    expect(row.artistName).toBe("Real");
  });

  it("maloja nulls a non-string album", () => {
    const [row] = parseMalojaJson(
      JSON.stringify({
        scrobbles: [
          scrobble({ artists: ["A"], title: "T", album: { albumtitle: 3 } }),
        ],
      }),
    );
    expect(row.releaseName).toBeNull();
  });

  const koitoListen = {
    listened_at: "2023-11-14T22:13:20Z",
    track: { aliases: [{ alias: "T" }] },
    artists: [{ aliases: [{ alias: "A" }] }],
  };

  it.each([
    [null],
    [7],
    [{ ...koitoListen, track: { aliases: "text" } }],
    [{ ...koitoListen, track: { aliases: [null, { alias: 5 }] } }],
    [{ ...koitoListen, artists: [null] }],
    [{ ...koitoListen, artists: [{ aliases: [{ alias: {} }] }] }],
    [{ ...koitoListen, listened_at: {} }],
  ])("koito json skips %j", (row) => {
    const rows = parseKoitoJson(
      JSON.stringify({ listens: [row, koitoListen] }),
    );
    expect(rows).toHaveLength(1);
  });

  it("koito json tolerates null artists beside a real one and a bad client", () => {
    const [row] = parseKoitoJson(
      JSON.stringify({
        listens: [
          {
            ...koitoListen,
            client: 7,
            artists: [{ is_primary: true, aliases: [{ alias: "A" }] }, null],
          },
        ],
      }),
    );
    expect(row.artistName).toBe("A");
    expect(row.musicService).toBe("koito");
  });

  it("primaryAlias ignores non-string aliases", () => {
    expect(primaryAlias([{ alias: 5 as never, is_primary: true }, { alias: "B" }])).toBe("B");
    expect(primaryAlias("x" as never)).toBe("");
    expect(primaryAlias([null as never])).toBe("");
  });
});

describe("listenbrainz malformed rows and mbids", () => {
  const line = (meta: Record<string, unknown>, listened_at: unknown = 1700000000) =>
    JSON.stringify({
      listened_at,
      track_metadata: { artist_name: "A", track_name: "T", ...meta },
    });
  const parse = (...lines: string[]) =>
    parseListenBrainzZip(
      Buffer.from(zipSync({ "listens/a.jsonl": strToU8(lines.join("\n")) })),
    );

  it.each(["null", "7", '"text"', "[]"])("skips JSON line %s", (bad) => {
    expect(parse(bad, line({}))).toHaveLength(1);
  });

  it("skips non-string names", () => {
    expect(
      parse(line({ artist_name: 1 }), line({ track_name: {} }), line({})),
    ).toHaveLength(1);
  });

  it("nulls a non-string release", () => {
    expect(parse(line({ release_name: 4 }))[0].releaseName).toBeNull();
  });

  it("falls back to mapping when additional_info mbids are empty", () => {
    const [row] = parse(
      line({
        additional_info: { artist_mbids: [] },
        mbid_mapping: { artist_mbids: [MBID] },
      }),
    );
    expect(row.artistMbids).toEqual([MBID]);
  });

  it("falls back to mapping when additional_info mbids are all invalid", () => {
    const [row] = parse(
      line({
        additional_info: { artist_mbids: ["junk"] },
        mbid_mapping: { artist_mbids: [MBID2] },
      }),
    );
    expect(row.artistMbids).toEqual([MBID2]);
  });

  it.each(["text", 7, {}, null])(
    "ignores non-array additional_info mbids %j without failing",
    (artist_mbids) => {
      const [row] = parse(
        line({
          additional_info: { artist_mbids },
          mbid_mapping: { artist_mbids: [MBID] },
        }),
        line({}),
      );
      expect(row.artistMbids).toEqual([MBID]);
    },
  );

  it("ignores a non-array mapping", () => {
    const [row] = parse(line({ mbid_mapping: { artist_mbids: "text" } }));
    expect(row.artistMbids).toBeUndefined();
  });
});
