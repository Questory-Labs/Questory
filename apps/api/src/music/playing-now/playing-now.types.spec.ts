import { describe, expect, it } from "vitest";
import {
  PLAYING_NOW_CACHE_TTL_SECONDS,
  playingNowCacheKey,
  toPlayingNowSnapshot,
} from "./playing-now.types";

describe("playing-now types", () => {
  it("builds cache key and snapshot", () => {
    expect(playingNowCacheKey("u1")).toBe("music:playing-now:u1");
    expect(PLAYING_NOW_CACHE_TTL_SECONDS).toBe(180);

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
});
