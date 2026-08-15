import { beforeEach, describe, expect, it, vi } from "vitest";
import { LastFmApiError } from "../../src/music/scrobbler/lastfm/lastfm.client";
import { LastFmSource } from "../../src/music/scrobbler/lastfm/lastfm.source";
import { SCROBBLER_AUTH_FAILED } from "../../src/music/scrobbler/scrobbler.constants";
import type { SourceConn } from "../../src/music/scrobbler/scrobbler.types";

function conn(overrides: Partial<SourceConn> = {}): SourceConn {
  return {
    id: "c1",
    userId: "u1",
    provider: "lastfm",
    externalUserId: "santosh",
    accessToken: "enc:sk",
    refreshToken: null,
    expiresAt: null,
    syncCursor: "1700000000",
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
  };
}

describe("LastFmSource", () => {
  const getRecentTracks = vi.fn();
  const sessionKey = vi.fn().mockReturnValue("sk");
  let source: LastFmSource;

  beforeEach(() => {
    getRecentTracks.mockReset();
    source = new LastFmSource(
      { getRecentTracks } as never,
      { sessionKey } as never,
    );
  });

  it("passes from= cursor and skips tracks at or before it", async () => {
    getRecentTracks.mockResolvedValue([
      {
        name: "Old",
        artist: { name: "A" },
        date: { uts: "1700000000" },
      },
      {
        name: "New",
        artist: { name: "A" },
        date: { uts: "1700000100" },
      },
    ]);
    const result = await source.poll(conn());
    expect(getRecentTracks).toHaveBeenCalledWith(
      expect.objectContaining({ from: "1700000000", user: "santosh", sk: "sk" }),
    );
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      kind: "listen",
      meta: { trackName: "New" },
    });
    expect(result.nextCursor).toBe("1700000100");
  });

  it("maps nowplaying separately from listens", async () => {
    getRecentTracks.mockResolvedValue([
      {
        name: "Live",
        artist: { name: "A" },
        "@attr": { nowplaying: "true" },
      },
      {
        name: "Done",
        artist: { name: "A" },
        date: { uts: "1700000500" },
      },
    ]);
    const result = await source.poll(conn({ syncCursor: "1" }));
    expect(result.observations.map((o) => o.kind)).toEqual([
      "playing_now",
      "listen",
    ]);
  });

  it("marks auth_failed on Last.fm error 9", async () => {
    getRecentTracks.mockRejectedValue(
      new LastFmApiError(9, "Invalid session key"),
    );
    const result = await source.poll(conn());
    expect(result.authFailed).toBe(true);
    expect(result.observations).toEqual([]);
    expect(SCROBBLER_AUTH_FAILED).toBe("auth_failed");
  });
});
