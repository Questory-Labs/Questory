import { describe, expect, it } from "vitest";
import { parseLastFmJson } from "../../src/music/imports/parsers/lastfm";

const MBID = "11111111-2222-3333-4444-555555555555";
const MBID2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const MBID3 = "99999999-8888-7777-6666-555555555555";

const track = (overrides: Record<string, unknown> = {}) => ({
  name: "Song",
  mbid: MBID,
  artist: { "#text": "Artist", mbid: MBID2 },
  album: { "#text": "Album", mbid: MBID3 },
  date: { uts: "1700000000", "#text": "14 Nov 2023, 22:13" },
  ...overrides,
});
const parse = (...tracks: unknown[]) =>
  parseLastFmJson(JSON.stringify([{ track: tracks }]));

describe("parseLastFmJson", () => {
  it("maps a track and reads uts as seconds", () => {
    expect(parse(track())).toEqual([
      {
        artistName: "Artist",
        trackName: "Song",
        releaseName: "Album",
        listenedAt: new Date(1700000000 * 1000),
        recordingMbid: MBID,
        releaseMbid: MBID3,
        artistMbids: [MBID2],
        musicService: "lastfm",
        submissionClient: "lastfm_import",
      },
    ]);
  });

  it("flattens all pages in order", () => {
    const rows = parseLastFmJson(
      JSON.stringify([
        { track: [track({ name: "One" })] },
        {},
        { track: [track({ name: "Two" }), track({ name: "Three" })] },
      ]),
    );
    expect(rows.map((r) => r.trackName)).toEqual(["One", "Two", "Three"]);
  });

  it("falls back to the date text when uts is absent", () => {
    const [row] = parse(track({ date: { "#text": "02 Jan 2006, 15:04" } }));
    expect(row.listenedAt).toEqual(new Date(2006, 0, 2, 15, 4));
  });

  it("falls back to the date text when uts is non-numeric", () => {
    const [row] = parse(
      track({ date: { uts: "soon", "#text": "02 Jan 2006, 15:04" } }),
    );
    expect(row.listenedAt).toEqual(new Date(2006, 0, 2, 15, 4));
  });

  it("drops now-playing rows and unparseable dates", () => {
    expect(parse(track({ date: undefined }))).toEqual([]);
    expect(parse(track({ date: { "#text": "not a date" } }))).toEqual([]);
    expect(parse(track({ date: { uts: "soon" } }))).toEqual([]);
  });

  it("drops uts beyond the representable date range", () => {
    expect(parse(track({ date: { uts: "10000000000000000" } }))).toEqual([]);
  });

  it("drops rows missing track or artist names", () => {
    expect(parse(track({ name: "  " }))).toEqual([]);
    expect(parse(track({ name: undefined }))).toEqual([]);
    expect(parse(track({ artist: undefined }))).toEqual([]);
    expect(parse(track({ artist: { "#text": " " } }))).toEqual([]);
  });

  it("uses the track name when the album is missing or blank", () => {
    expect(parse(track({ album: undefined }))[0].releaseName).toBe("Song");
    expect(parse(track({ album: { "#text": "  " } }))[0].releaseName).toBe(
      "Song",
    );
  });

  it("nulls malformed mbids", () => {
    const [row] = parse(
      track({
        mbid: "",
        artist: { "#text": "Artist", mbid: "nope" },
        album: { "#text": "Album", mbid: 7 },
      }),
    );
    expect(row.recordingMbid).toBeNull();
    expect(row.releaseMbid).toBeNull();
    expect(row.artistMbids).toBeUndefined();
  });

  it("preserves unicode and duplicates", () => {
    const row = track({ name: "Жить", artist: { "#text": "Земфира" } });
    const rows = parse(row, row);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ trackName: "Жить", artistName: "Земфира" });
  });

  it("rejects non-array and truncated documents", () => {
    expect(() => parseLastFmJson('{"track":[]}')).toThrow(
      /must be a JSON array of pages/,
    );
    expect(() => parseLastFmJson('[{"track":[')).toThrow(SyntaxError);
  });

  it("returns nothing for empty exports", () => {
    expect(parseLastFmJson("[]")).toEqual([]);
    expect(parseLastFmJson('[{"track":[]}]')).toEqual([]);
  });
});
