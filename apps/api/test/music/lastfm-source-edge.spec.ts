import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LastFmApiError } from "../../src/music/scrobbler/lastfm/lastfm.client";
import { LastFmSource } from "../../src/music/scrobbler/lastfm/lastfm.source";
import {
  LASTFM_CATCHUP_LOOKBACK_MS,
  LASTFM_CATCHUP_MAX_TRACKS,
  LASTFM_POLL_INTERVAL_MS,
  LASTFM_RECENT_LIMIT,
} from "../../src/music/scrobbler/scrobbler.constants";
import type { SourceConn } from "../../src/music/scrobbler/scrobbler.types";

const NOW = new Date("2026-11-07T00:00:00Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);

function conn(overrides: Partial<SourceConn> = {}): SourceConn {
  return {
    id: "c1",
    userId: "u1",
    provider: "lastfm",
    externalUserId: "rj",
    accessToken: "enc:sk",
    refreshToken: null,
    expiresAt: null,
    syncCursor: "1000",
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
  };
}

function played(uts: string | number, name = "T") {
  return { name, artist: { name: "A" }, date: { uts: String(uts) } };
}

describe("LastFmSource edge cases", () => {
  const getRecentTracks = vi.fn();
  const sessionKey = vi.fn();
  let source: LastFmSource;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    getRecentTracks.mockReset();
    sessionKey.mockReset();
    sessionKey.mockReturnValue("sk");
    source = new LastFmSource(
      { getRecentTracks } as never,
      { sessionKey } as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("exposes its provider id and poll interval", () => {
    expect(source.id).toBe("lastfm");
    expect(source.pollIntervalMs).toBe(LASTFM_POLL_INTERVAL_MS);
  });

  it("reflects credential configuration", () => {
    vi.stubEnv("LASTFM_API_KEY", "");
    expect(source.isConfigured()).toBe(false);
    vi.stubEnv("LASTFM_API_KEY", "k");
    vi.stubEnv("LASTFM_API_SECRET", "s");
    vi.stubEnv("LASTFM_REDIRECT_URI", "http://x/cb");
    expect(source.isConfigured()).toBe(true);
  });

  it("ensureSession returns the same connection", async () => {
    const c = conn();
    await expect(source.ensureSession(c)).resolves.toBe(c);
  });

  it("reports a missing username without calling Last.fm", async () => {
    const result = await source.poll(conn({ externalUserId: null }));
    expect(result).toEqual({
      observations: [],
      error: "missing Last.fm username",
    });
    expect(getRecentTracks).not.toHaveBeenCalled();
    expect(sessionKey).not.toHaveBeenCalled();
  });

  it("uses the session key from the polled connection", async () => {
    getRecentTracks.mockResolvedValue([]);
    const c = conn();
    await source.poll(c);
    expect(sessionKey).toHaveBeenCalledWith(c);
  });

  describe("catch-up window", () => {
    it.each([[null], [""]])("catches up when the cursor is %j", async (syncCursor) => {
      getRecentTracks.mockResolvedValue([]);
      await source.poll(conn({ syncCursor }));
      expect(getRecentTracks).toHaveBeenCalledWith({
        user: "rj",
        from: String(NOW_S - LASTFM_CATCHUP_LOOKBACK_MS / 1000),
        limit: LASTFM_CATCHUP_MAX_TRACKS,
        sk: "sk",
      });
    });

    it("uses the recent limit once a cursor exists", async () => {
      getRecentTracks.mockResolvedValue([]);
      await source.poll(conn({ syncCursor: "1000" }));
      expect(getRecentTracks).toHaveBeenCalledWith({
        user: "rj",
        from: "1000",
        limit: LASTFM_RECENT_LIMIT,
        sk: "sk",
      });
    });

    it("keeps every listen during catch-up", async () => {
      getRecentTracks.mockResolvedValue([played(500), played(400)]);
      const result = await source.poll(conn({ syncCursor: null }));
      expect(result.observations).toHaveLength(2);
      expect(result.nextCursor).toBe("500");
    });
  });

  describe("cursor handling", () => {
    it("keeps the previous cursor when nothing new arrives", async () => {
      getRecentTracks.mockResolvedValue([]);
      const result = await source.poll(conn({ syncCursor: "1000" }));
      expect(result).toEqual({ observations: [], nextCursor: "1000" });
    });

    it("seeds the cursor at now on an empty first poll", async () => {
      getRecentTracks.mockResolvedValue([]);
      const result = await source.poll(conn({ syncCursor: null }));
      expect(result.nextCursor).toBe(String(NOW_S));
    });

    it("drops already-seen listens so re-polling is idempotent", async () => {
      getRecentTracks.mockResolvedValue([played(1000), played(999)]);
      const result = await source.poll(conn({ syncCursor: "1000" }));
      expect(result.observations).toEqual([]);
      expect(result.nextCursor).toBe("1000");
    });

    it("advances to the max regardless of ordering", async () => {
      getRecentTracks.mockResolvedValue([played(1100), played(1300), played(1200)]);
      const result = await source.poll(conn({ syncCursor: "1000" }));
      expect(result.observations).toHaveLength(3);
      expect(result.nextCursor).toBe("1300");
    });

    it("recovers from a non-numeric stored cursor", async () => {
      getRecentTracks.mockResolvedValue([played(1100)]);
      const result = await source.poll(conn({ syncCursor: "garbage" }));
      expect(result.nextCursor).toBe("1100");
    });

    it("does not advance on now-playing alone", async () => {
      getRecentTracks.mockResolvedValue([
        { name: "T", artist: { name: "A" }, "@attr": { nowplaying: "true" } },
      ]);
      const result = await source.poll(conn({ syncCursor: "1000" }));
      expect(result.observations.map((o) => o.kind)).toEqual(["playing_now"]);
      expect(result.nextCursor).toBe("1000");
    });
  });

  describe("malformed tracks", () => {
    it.each([
      ["no date", { name: "T", artist: { name: "A" } }],
      ["non-numeric uts", played("abc")],
      ["zero uts", played(0)],
      ["no name", { artist: { name: "A" }, date: { uts: "2000" } }],
      ["no artist", { name: "T", date: { uts: "2000" } }],
    ])("skips %s without advancing the cursor", async (_name, track) => {
      getRecentTracks.mockResolvedValue([track]);
      const result = await source.poll(conn({ syncCursor: "1000" }));
      expect(result.observations).toEqual([]);
      expect(result.nextCursor).toBe("1000");
    });

    it("drops a now-playing entry with no artist", async () => {
      getRecentTracks.mockResolvedValue([
        { name: "T", "@attr": { nowplaying: "true" } },
      ]);
      const result = await source.poll(conn());
      expect(result.observations).toEqual([]);
    });

    it("keeps valid tracks around malformed ones", async () => {
      getRecentTracks.mockResolvedValue([
        { name: "T" },
        played(1100, "Good"),
        played("abc"),
      ]);
      const result = await source.poll(conn());
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0]).toMatchObject({
        meta: { trackName: "Good" },
      });
    });
  });

  describe("errors", () => {
    it.each([9, 4])("flags auth failure for code %s", async (code) => {
      getRecentTracks.mockRejectedValue(new LastFmApiError(code, "denied"));
      await expect(source.poll(conn())).resolves.toEqual({
        observations: [],
        authFailed: true,
        error: "denied",
      });
    });

    it("rethrows non-auth API errors so the loop can retry", async () => {
      const err = new LastFmApiError(29, "rate limited");
      getRecentTracks.mockRejectedValue(err);
      await expect(source.poll(conn())).rejects.toBe(err);
    });

    it("rethrows transport errors", async () => {
      getRecentTracks.mockRejectedValue(new Error("timeout"));
      await expect(source.poll(conn())).rejects.toThrow("timeout");
    });
  });
});
