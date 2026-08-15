import { describe, expect, it } from "vitest";
import {
  asTrackArray,
  isNowPlaying,
  mapLastFmTrack,
  trackUts,
} from "../../src/music/scrobbler/lastfm/lastfm.map";

describe("lastfm.map", () => {
  const scrobbled = {
    name: "Daydreaming",
    mbid: "rec-1",
    artist: { name: "Radiohead", mbid: "art-1" },
    album: { "#text": "A Moon Shaped Pool", mbid: "rel-1" },
    date: { uts: "1700000000" },
  };

  it("maps a scrobbled track with uts, album, and MBIDs", () => {
    const meta = mapLastFmTrack(scrobbled, "listen");
    expect(meta).toMatchObject({
      artistName: "Radiohead",
      trackName: "Daydreaming",
      releaseName: "A Moon Shaped Pool",
      listenType: "single",
      musicService: "lastfm",
      submissionClient: "questory_lastfm",
      recordingMbid: "rec-1",
      releaseMbid: "rel-1",
      artistMbids: ["art-1"],
    });
    expect(meta?.listenedAt.toISOString()).toBe(
      new Date(1_700_000_000 * 1000).toISOString(),
    );
  });

  it("maps nowplaying without requiring uts", () => {
    const meta = mapLastFmTrack(
      {
        name: "Weird Fishes",
        artist: { "#text": "Radiohead" },
        "@attr": { nowplaying: "true" },
      },
      "playing_now",
    );
    expect(meta?.listenType).toBe("playing_now");
    expect(meta?.artistName).toBe("Radiohead");
  });

  it("rejects listens missing uts", () => {
    expect(
      mapLastFmTrack(
        { name: "Go Slowly", artist: { name: "Radiohead" } },
        "listen",
      ),
    ).toBeNull();
  });

  it("detects nowplaying and wraps a single track object", () => {
    expect(isNowPlaying({ "@attr": { nowplaying: "true" } })).toBe(true);
    expect(asTrackArray(scrobbled)).toHaveLength(1);
    expect(trackUts(scrobbled)).toBe(1_700_000_000);
  });
});
