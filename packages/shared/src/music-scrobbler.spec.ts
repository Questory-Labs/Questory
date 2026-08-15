import { describe, expect, it } from "vitest";
import { MusicScrobblerStatusSchema } from "./music-scrobbler";

describe("MusicScrobblerStatusSchema", () => {
  it("accepts a disconnected Last.fm status", () => {
    const parsed = MusicScrobblerStatusSchema.safeParse({
      nativeScrobbling: false,
      lastfm: {
        configured: true,
        connected: false,
        username: null,
        lastSyncedAt: null,
        lastError: null,
      },
    });
    expect(parsed.success).toBe(true);
  });
});
