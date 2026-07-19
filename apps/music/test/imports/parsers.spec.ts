import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { detectImportSource } from "../../src/imports/parsers/detect";
import { parseSpotifyJson } from "../../src/imports/parsers/spotify";
import { parseMalojaJson } from "../../src/imports/parsers/maloja";
import { parseLastFmJson } from "../../src/imports/parsers/lastfm";
import { parseListenBrainzZip } from "../../src/imports/parsers/listenbrainz";
import { parseKoitoJson } from "../../src/imports/parsers/koito-json";

describe("music import parsers", () => {
  it("parses Spotify trackdone rows and skips others", () => {
    const listens = parseSpotifyJson(
      JSON.stringify([
        {
          ts: "2020-01-01T12:00:00Z",
          master_metadata_track_name: "Song",
          master_metadata_album_artist_name: "Artist",
          master_metadata_album_album_name: "Album",
          reason_end: "trackdone",
          ms_played: 180000,
        },
        {
          ts: "2020-01-01T12:01:00Z",
          master_metadata_track_name: "Skip",
          master_metadata_album_artist_name: "Artist",
          reason_end: "fwdbtn",
          ms_played: 1000,
        },
      ]),
    );
    expect(listens).toHaveLength(1);
    expect(listens[0].trackName).toBe("Song");
    expect(listens[0].durationMs).toBe(180000);
    expect(listens[0].musicService).toBe("spotify");
  });

  it("normalizes Maloja artist bullets", () => {
    const listens = parseMalojaJson(
      JSON.stringify({
        scrobbles: [
          {
            time: 1600000000,
            track: {
              artists: ["feat", "Main \u2022 feat"],
              title: "Track",
              album: { albumtitle: "LP" },
            },
          },
        ],
      }),
    );
    expect(listens).toHaveLength(1);
    expect(listens[0].artistName).toBe("Main");
    expect(listens[0].releaseName).toBe("LP");
  });

  it("parses Last.fm ghan.nl pages", () => {
    const listens = parseLastFmJson(
      JSON.stringify([
        {
          track: [
            {
              name: "Track",
              mbid: "11111111-1111-1111-1111-111111111111",
              artist: {
                mbid: "22222222-2222-2222-2222-222222222222",
                "#text": "Artist",
              },
              album: {
                mbid: "33333333-3333-3333-3333-333333333333",
                "#text": "Album",
              },
              date: { uts: "1600000000", "#text": "13 Sep 2020, 12:26" },
            },
          ],
        },
      ]),
    );
    expect(listens).toHaveLength(1);
    expect(listens[0].recordingMbid).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(listens[0].listenedAt.toISOString()).toBe(
      "2020-09-13T12:26:40.000Z",
    );
  });

  it("parses ListenBrainz zip jsonl", () => {
    const line = JSON.stringify({
      listened_at: 1600000000,
      track_metadata: {
        artist_name: "Artist",
        track_name: "Track",
        release_name: "Album",
        additional_info: {
          recording_mbid: "11111111-1111-1111-1111-111111111111",
          duration_ms: 200000,
          media_player: "foobar2000",
        },
      },
    });
    const zipped = zipSync({
      "listens/2020/listens-2020-01.jsonl": strToU8(line + "\n"),
    });
    const listens = parseListenBrainzZip(Buffer.from(zipped));
    expect(listens).toHaveLength(1);
    expect(listens[0].mediaPlayer).toBe("foobar2000");
    expect(listens[0].durationMs).toBe(200000);
  });

  it("parses Koito JSON export", () => {
    const listens = parseKoitoJson(
      JSON.stringify({
        version: "1",
        user: "me",
        listens: [
          {
            listened_at: "2020-01-01T00:00:00.000Z",
            client: "spotify",
            track: {
              mbid: null,
              duration: 120,
              aliases: [{ alias: "Track", is_primary: true, source: "Import" }],
            },
            album: {
              mbid: null,
              aliases: [{ alias: "Album", is_primary: true, source: "Import" }],
            },
            artists: [
              {
                is_primary: true,
                mbid: null,
                aliases: [
                  { alias: "Artist", is_primary: true, source: "Import" },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(listens).toHaveLength(1);
    expect(listens[0].durationMs).toBe(120000);
    expect(listens[0].musicService).toBe("spotify");
  });

  it("detects formats from filename and magic bytes", () => {
    expect(
      detectImportSource(
        "Streaming_History_Audio_2020.json",
        Buffer.from("[]"),
      ),
    ).toBe("spotify_json");
    expect(detectImportSource("maloja-export.json", Buffer.from("{}"))).toBe(
      "maloja_json",
    );
    expect(
      detectImportSource("recenttracks-export.json", Buffer.from("[]")),
    ).toBe("lastfm_json");
    expect(
      detectImportSource(
        "listenbrainz-export.zip",
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      ),
    ).toBe("listenbrainz_zip");
    expect(
      detectImportSource(
        "koito.db",
        Buffer.concat([Buffer.from("SQLite format 3\0"), Buffer.alloc(16)]),
      ),
    ).toBe("koito_db");
  });

  it("sniffs JSON content from a small sample without full parse", () => {
    const spotifySample = Buffer.from(
      `[{"ts":"2020-01-01T00:00:00Z","master_metadata_track_name":"A","ms_played":1${"0".repeat(200)}}]`,
    );
    expect(detectImportSource("unknown.json", spotifySample)).toBe(
      "spotify_json",
    );
    expect(
      detectImportSource(
        "export.json",
        Buffer.from(`{"version":"1","listens":[{"listened_at":"x"}]}`),
      ),
    ).toBe("koito_json");
  });
});
