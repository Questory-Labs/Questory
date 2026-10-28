import { describe, expect, it } from "vitest";
import {
  PLAYING_NOW_CACHE_TTL_SECONDS,
  PLAYING_NOW_STALE_MS,
  playingNowCacheKey,
  playingNowSource,
  resolvePlayingNowStartedAt,
  toPlayingNowSnapshot,
} from "./playing-now.types";

describe("playing-now types", () => {
  it("builds cache key and keeps stale window equal to TTL", () => {
    expect(playingNowCacheKey("u1")).toBe("music:playing-now:u1");
    expect(PLAYING_NOW_CACHE_TTL_SECONDS).toBe(90);
    expect(PLAYING_NOW_STALE_MS).toBe(90_000);

    const snap = toPlayingNowSnapshot({
      updatedAt: new Date("2026-07-29T00:00:00.000Z"),
      track: {
        id: "t1",
        title: "Song",
        artistId: "a1",
        artistName: "Artist",
        releaseId: null,
        releaseTitle: null,
        imageUrl: null,
      },
    });
    expect(snap.updatedAt).toBe("2026-07-29T00:00:00.000Z");
    expect(snap.track.title).toBe("Song");
  });

  it("carries startedAt, source, year and duration into the snapshot", () => {
    const snap = toPlayingNowSnapshot({
      updatedAt: "2026-07-29T00:01:00.000Z",
      startedAt: new Date("2026-07-29T00:00:00.000Z"),
      source: "multi-scrobbler",
      track: {
        id: "t1",
        title: "Song",
        artistId: "a1",
        artistName: "Artist",
        releaseId: "r1",
        releaseTitle: "Album",
        imageUrl: null,
        year: 1984,
        durationMs: 252_000,
      },
    });
    expect(snap.startedAt).toBe("2026-07-29T00:00:00.000Z");
    expect(snap.source).toBe("multi-scrobbler");
    expect(snap.track.year).toBe(1984);
    expect(snap.track.durationMs).toBe(252_000);
  });

  it("defaults missing optional fields to null", () => {
    const snap = toPlayingNowSnapshot({
      updatedAt: "2026-07-29T00:01:00.000Z",
      track: {
        id: "t1",
        title: "Song",
        artistId: "a1",
        artistName: "Artist",
        releaseId: null,
        releaseTitle: null,
        imageUrl: null,
      },
    });
    expect(snap.startedAt).toBeNull();
    expect(snap.source).toBeNull();
    expect(snap.track.year).toBeNull();
    expect(snap.track.durationMs).toBeNull();
  });

  it("labels Last.fm poller and ListenBrainz submissions", () => {
    expect(
      playingNowSource({
        submissionClient: "questory_lastfm",
        musicService: "lastfm",
      }),
    ).toBe("lastfm");
    expect(
      playingNowSource({ submissionClient: "multi-scrobbler", musicService: null }),
    ).toBe("multi-scrobbler");
    expect(playingNowSource({ submissionClient: null, musicService: "spotify" })).toBe(
      "spotify",
    );
    expect(playingNowSource({})).toBeNull();
  });

  it("keeps startedAt while the same track refreshes and resets on change", () => {
    const started = new Date("2026-07-29T00:00:00.000Z");
    const now = new Date("2026-07-29T00:02:00.000Z");
    expect(
      resolvePlayingNowStartedAt({ trackId: "t1", startedAt: started }, "t1", now),
    ).toBe(started);
    expect(
      resolvePlayingNowStartedAt({ trackId: "t1", startedAt: started }, "t2", now),
    ).toBe(now);
    expect(
      resolvePlayingNowStartedAt({ trackId: "t1", startedAt: null }, "t1", now),
    ).toBe(now);
    expect(resolvePlayingNowStartedAt(null, "t1", now)).toBe(now);
  });
});
