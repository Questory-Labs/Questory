import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListenBrainzService } from "../../src/music/listenbrainz/listenbrainz.service";

const findMany = vi.fn();
const count = vi.fn();
const findByUsername = vi.fn();
const getListenbrainzUsername = vi.fn();
const getSnapshot = vi.fn();

function listenRow(ts: number) {
  return {
    listenedAt: new Date(ts * 1000),
    mediaPlayer: "mpv",
    submissionClient: "ms",
    musicService: null,
    track: {
      title: "Track",
      recordingMbid: "rec",
      spotifyId: null,
      durationMs: 1000,
      artist: { name: "Artist" },
      release: { title: "Release", mbid: "rel" },
    },
  };
}

describe("ListenBrainzService read endpoints", () => {
  let service: ListenBrainzService;

  beforeEach(() => {
    for (const fn of [
      findMany,
      count,
      findByUsername,
      getListenbrainzUsername,
      getSnapshot,
    ]) {
      fn.mockReset();
    }
    findByUsername.mockResolvedValue({ id: "u1", personaName: "Persona" });
    getListenbrainzUsername.mockResolvedValue("rj");
    findMany.mockResolvedValue([]);
    service = new ListenBrainzService(
      { listen: { findMany, count } } as never,
      {} as never,
      {} as never,
      { getSnapshot } as never,
      { findByUsername, getListenbrainzUsername } as never,
    );
  });

  describe("getListens", () => {
    it("returns null for an unknown user without querying", async () => {
      findByUsername.mockResolvedValue(null);
      await expect(service.getListens("ghost", {})).resolves.toBeNull();
      expect(findMany).not.toHaveBeenCalled();
    });

    it("always scopes to the resolved user and sorts newest first", async () => {
      await service.getListens("rj", {});
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          orderBy: { listenedAt: "desc" },
          take: 25,
        }),
      );
    });

    it.each([
      [undefined, 25],
      [0, 1],
      [-5, 1],
      [10, 10],
      [1000, 1000],
      [5000, 1000],
      [Number.NaN, 25],
      [Infinity, 25],
      [1.5, 1],
      [0.5, 1],
      [10.9, 10],
    ])("clamps count %s to %s", async (input, take) => {
      await service.getListens("rj", { count: input });
      expect(findMany.mock.calls[0][0].take).toBe(take);
    });

    it("applies a single bound as an exclusive filter", async () => {
      await service.getListens("rj", { maxTs: 200 });
      expect(findMany.mock.calls[0][0].where).toEqual({
        userId: "u1",
        listenedAt: { lt: new Date(200_000) },
      });
      findMany.mockClear();
      await service.getListens("rj", { minTs: 100 });
      expect(findMany.mock.calls[0][0].where).toEqual({
        userId: "u1",
        listenedAt: { gt: new Date(100_000) },
      });
    });

    it("rejects an equal min and max", async () => {
      await expect(
        service.getListens("rj", { minTs: 100, maxTs: 100 }),
      ).rejects.toMatchObject({
        response: { code: 400, error: "max_ts should be greater than min_ts" },
      });
    });

    it("ignores non-finite bounds", async () => {
      await service.getListens("rj", { minTs: Number.NaN, maxTs: Infinity });
      expect(findMany.mock.calls[0][0].where).toEqual({ userId: "u1" });
    });

    it("returns an empty payload shape", async () => {
      const result = await service.getListens("rj", {});
      expect(result).toEqual({
        payload: { count: 0, latest_listen_ts: 0, listens: [], user_id: "rj" },
      });
    });

    it("maps rows to the ListenBrainz shape", async () => {
      findMany.mockResolvedValue([listenRow(200), listenRow(100)]);
      const result = await service.getListens("rj", {});
      expect(result?.payload.count).toBe(2);
      expect(result?.payload.latest_listen_ts).toBe(200);
      expect(result?.payload.listens[0]).toEqual({
        listened_at: 200,
        track_metadata: {
          artist_name: "Artist",
          track_name: "Track",
          release_name: "Release",
          additional_info: {
            recording_mbid: "rec",
            release_mbid: "rel",
            spotify_id: undefined,
            duration_ms: 1000,
            media_player: "mpv",
            submission_client: "ms",
            music_service: undefined,
          },
        },
      });
    });

    it("tolerates a track without a release", async () => {
      const row = listenRow(5);
      findMany.mockResolvedValue([{ ...row, track: { ...row.track, release: null } }]);
      const result = await service.getListens("rj", {});
      const meta = result?.payload.listens[0].track_metadata;
      expect(meta?.release_name).toBeUndefined();
      expect(meta?.additional_info.release_mbid).toBeUndefined();
    });

    it("falls back to personaName for user_id", async () => {
      getListenbrainzUsername.mockResolvedValue(null);
      const result = await service.getListens("rj", {});
      expect(result?.payload.user_id).toBe("Persona");
    });
  });

  describe("getListenCount", () => {
    it("returns null for an unknown user", async () => {
      findByUsername.mockResolvedValue(null);
      await expect(service.getListenCount("ghost")).resolves.toBeNull();
      expect(count).not.toHaveBeenCalled();
    });

    it("counts only the resolved user's listens", async () => {
      count.mockResolvedValue(42);
      await expect(service.getListenCount("rj")).resolves.toEqual({
        payload: { count: 42 },
      });
      expect(count).toHaveBeenCalledWith({ where: { userId: "u1" } });
    });
  });

  describe("getPlayingNow", () => {
    it("returns null for an unknown user", async () => {
      findByUsername.mockResolvedValue(null);
      await expect(service.getPlayingNow("ghost")).resolves.toBeNull();
      expect(getSnapshot).not.toHaveBeenCalled();
    });

    it("returns an empty list when nothing is playing", async () => {
      getSnapshot.mockResolvedValue(null);
      await expect(service.getPlayingNow("rj")).resolves.toEqual({
        payload: { count: 0, listens: [], user_id: "rj" },
      });
      expect(getSnapshot).toHaveBeenCalledWith("u1");
    });

    it("maps the snapshot and omits a null release", async () => {
      getSnapshot.mockResolvedValue({
        track: { artistName: "A", title: "T", releaseTitle: null },
      });
      const result = await service.getPlayingNow("rj");
      expect(result?.payload.count).toBe(1);
      expect(result?.payload.listens[0].track_metadata).toEqual({
        artist_name: "A",
        track_name: "T",
        release_name: undefined,
      });
    });

    it("falls back to personaName for user_id", async () => {
      getSnapshot.mockResolvedValue(null);
      getListenbrainzUsername.mockResolvedValue(null);
      const result = await service.getPlayingNow("rj");
      expect(result?.payload.user_id).toBe("Persona");
    });
  });
});
