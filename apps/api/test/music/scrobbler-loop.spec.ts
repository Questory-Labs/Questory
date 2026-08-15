import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrobblerLoop } from "../../src/music/scrobbler/scrobbler.loop";
import { SCROBBLER_AUTH_FAILED } from "../../src/music/scrobbler/scrobbler.constants";
import type { ScrobbleSource, SourceConn } from "../../src/music/scrobbler/scrobbler.types";

function conn(overrides: Partial<SourceConn> = {}): SourceConn {
  return {
    id: "c1",
    userId: "u1",
    provider: "lastfm",
    externalUserId: "user",
    accessToken: "sk",
    refreshToken: null,
    expiresAt: null,
    syncCursor: "1",
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
  };
}

describe("ScrobblerLoop", () => {
  const poll = vi.fn();
  const ensureSession = vi.fn(async (c: SourceConn) => c);
  const listActive = vi.fn();
  const get = vi.fn();
  const updatePoll = vi.fn();
  const upsertListen = vi.fn();
  const submit = vi.fn();
  const clear = vi.fn();
  const enqueueTrack = vi.fn();
  const acquireLock = vi.fn().mockResolvedValue(true);

  const source: ScrobbleSource = {
    id: "lastfm",
    pollIntervalMs: 1,
    isConfigured: () => true,
    ensureSession,
    poll,
  };

  let loop: ScrobblerLoop;

  beforeEach(() => {
    poll.mockReset();
    ensureSession.mockClear();
    listActive.mockReset();
    get.mockReset();
    updatePoll.mockReset();
    upsertListen.mockReset();
    submit.mockReset();
    clear.mockReset();
    enqueueTrack.mockReset();
    acquireLock.mockReset();
    acquireLock.mockResolvedValue(true);
    upsertListen.mockResolvedValue({ track: { id: "t1" } });

    loop = new ScrobblerLoop(
      [source],
      { listActive, get, updatePoll } as never,
      { upsertListen } as never,
      { submit, clear } as never,
      { enqueueTrack } as never,
      { acquireLock } as never,
    );
    // First due is startedAt + stagger; freeze start so ticks are always due.
    (loop as unknown as { startedAt: number }).startedAt = 0;
  });

  it("dispatches only connections whose provider is registered", async () => {
    listActive.mockResolvedValue([
      conn(),
      conn({ id: "c2", provider: "spotify", userId: "u2" }),
    ]);
    poll.mockResolvedValue({
      observations: [
        {
          kind: "listen",
          meta: {
            artistName: "A",
            trackName: "B",
            listenedAt: new Date(),
            listenType: "single",
          },
        },
      ],
      nextCursor: "2",
    });
    await loop.tick();
    expect(poll).toHaveBeenCalledTimes(1);
    expect(upsertListen).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledWith("u1");
  });

  it("skips playing-now writes when the fingerprint is unchanged", async () => {
    const playing = {
      kind: "playing_now" as const,
      meta: {
        artistName: "A",
        trackName: "Now",
        listenedAt: new Date(),
        listenType: "playing_now",
      },
    };
    get.mockResolvedValue(conn());
    poll.mockResolvedValue({ observations: [playing], nextCursor: "2" });
    await loop.pollNow("u1", "lastfm");
    await loop.pollNow("u1", "lastfm");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("persists auth_failed and does not apply observations", async () => {
    listActive.mockResolvedValue([conn()]);
    poll.mockResolvedValue({
      observations: [
        {
          kind: "listen",
          meta: {
            artistName: "A",
            trackName: "B",
            listenedAt: new Date(),
            listenType: "single",
          },
        },
      ],
      authFailed: true,
    });
    await loop.tick();
    expect(upsertListen).not.toHaveBeenCalled();
    expect(updatePoll).toHaveBeenCalledWith("c1", {
      lastError: SCROBBLER_AUTH_FAILED,
    });
  });

  it("enqueues due polls instead of fetching when a queue is attached", async () => {
    const add = vi.fn().mockResolvedValue({});
    (loop as unknown as { queue: { add: typeof add } }).queue = { add };
    listActive.mockResolvedValue([conn()]);
    await loop.tick();
    expect(poll).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(
      "poll",
      { userId: "u1", provider: "lastfm" },
      expect.objectContaining({ jobId: "poll:lastfm:u1" }),
    );
  });

  it("pollNow enqueues instead of polling when a queue is attached", async () => {
    const add = vi.fn().mockResolvedValue({});
    (loop as unknown as { queue: { add: typeof add } }).queue = { add };
    get.mockResolvedValue(conn());
    await loop.pollNow("u1", "lastfm");
    expect(poll).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalled();
  });
});
