import { BadRequestException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "../../src/music/lib/tokens";
import { ListenBrainzService } from "../../src/music/listenbrainz/listenbrainz.service";

const upsertListen = vi.fn();
const enqueueTrack = vi.fn();
const submit = vi.fn();
const clear = vi.fn();
const findByTokenHash = vi.fn();

function makeService() {
  return new ListenBrainzService(
    {} as never,
    { upsertListen } as never,
    { enqueueTrack } as never,
    { submit, clear } as never,
    { findByTokenHash } as never,
  );
}

function item(overrides: Record<string, unknown> = {}, listenedAt = 1700000000) {
  return {
    listened_at: listenedAt,
    track_metadata: {
      artist_name: "Artist",
      track_name: "Track",
      ...overrides,
    },
  };
}

function firstMeta() {
  return upsertListen.mock.calls[0][1];
}

describe("ListenBrainzService", () => {
  let service: ListenBrainzService;

  beforeEach(() => {
    for (const fn of [upsertListen, enqueueTrack, submit, clear, findByTokenHash]) {
      fn.mockReset();
    }
    upsertListen.mockResolvedValue({ track: { id: "t1" } });
    enqueueTrack.mockResolvedValue(undefined);
    service = makeService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("validateToken", () => {
    it("reports a missing token as invalid with HTTP-style code 200", async () => {
      await expect(service.validateToken(null)).resolves.toEqual({
        code: 200,
        message: "Token missing.",
        valid: false,
      });
      expect(findByTokenHash).not.toHaveBeenCalled();
    });

    it("reports an unknown token as invalid without user data", async () => {
      findByTokenHash.mockResolvedValue(null);
      const result = await service.validateToken("nope");
      expect(result).toEqual({ code: 200, message: "Token invalid.", valid: false });
      expect(findByTokenHash).toHaveBeenCalledWith(hashToken("nope"));
    });

    it("returns the username for a valid token", async () => {
      findByTokenHash.mockResolvedValue({ id: "u1", username: "rj" });
      await expect(service.validateToken("good")).resolves.toEqual({
        code: 200,
        message: "Token valid.",
        valid: true,
        user_name: "rj",
      });
    });
  });

  describe("submitListens validation", () => {
    it.each([
      ["missing payload", {}],
      ["empty payload", { payload: [] }],
      ["non-array payload", { payload: "nope" }],
      ["object payload", { payload: { listened_at: 1 } }],
    ])("rejects %s", async (_name, body) => {
      await expect(
        service.submitListens("u1", body as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(upsertListen).not.toHaveBeenCalled();
    });

    it("accepts exactly 1000 listens and rejects 1001", async () => {
      const ok = await service.submitListens("u1", {
        listen_type: "import",
        payload: Array.from({ length: 1000 }, () => item()),
      });
      expect(ok).toEqual({ status: "ok", accepted: 1000 });

      upsertListen.mockClear();
      await expect(
        service.submitListens("u1", {
          listen_type: "import",
          payload: Array.from({ length: 1001 }, () => item()),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(upsertListen).not.toHaveBeenCalled();
    });

    it("rejects an unsupported listen_type before writing", async () => {
      const err = await service
        .submitListens("u1", { listen_type: "bogus", payload: [item()] })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({
        code: 400,
        error: "Unsupported listen_type: bogus",
      });
      expect(upsertListen).not.toHaveBeenCalled();
    });

    it("defaults to single and lowercases listen_type", async () => {
      await service.submitListens("u1", { payload: [item()] });
      expect(firstMeta().listenType).toBe("single");
      upsertListen.mockClear();
      await service.submitListens("u1", { listen_type: "IMPORT", payload: [item()] });
      expect(firstMeta().listenType).toBe("import");
    });
  });

  describe("submitListens single and import", () => {
    it("writes every valid item for the given user and enqueues enrichment", async () => {
      upsertListen
        .mockResolvedValueOnce({ track: { id: "t1" } })
        .mockResolvedValueOnce({ track: { id: "t2" } });
      const result = await service.submitListens("u1", {
        listen_type: "single",
        payload: [item(), item({ track_name: "Other" })],
      });
      expect(result).toEqual({ status: "ok", accepted: 2 });
      expect(upsertListen.mock.calls.map((c) => c[0])).toEqual(["u1", "u1"]);
      expect(enqueueTrack.mock.calls.map((c) => c[0])).toEqual(["t1", "t2"]);
    });

    it("clears playing-now after an accepted single scrobble", async () => {
      await service.submitListens("u1", { listen_type: "single", payload: [item()] });
      expect(clear).toHaveBeenCalledWith("u1");
    });

    it("keeps playing-now during imports", async () => {
      await service.submitListens("u1", { listen_type: "import", payload: [item()] });
      expect(clear).not.toHaveBeenCalled();
    });

    it("propagates a catalog write failure", async () => {
      upsertListen.mockRejectedValue(new Error("db down"));
      await expect(
        service.submitListens("u1", { payload: [item()] }),
      ).rejects.toThrow("db down");
      expect(clear).not.toHaveBeenCalled();
    });
  });

  describe("submitListens playing_now", () => {
    it("submits only the first item and writes no listen", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-07T00:00:00Z"));
      const result = await service.submitListens("u1", {
        listen_type: "playing_now",
        payload: [item({ track_name: "First" }, 1), item({ track_name: "Second" })],
      });
      expect(result).toEqual({ status: "ok" });
      expect(submit).toHaveBeenCalledTimes(1);
      expect(submit.mock.calls[0][0]).toBe("u1");
      expect(submit.mock.calls[0][1]).toMatchObject({
        trackName: "First",
        listenType: "playing_now",
        listenedAt: new Date("2026-11-07T00:00:00Z"),
      });
      expect(upsertListen).not.toHaveBeenCalled();
      expect(clear).not.toHaveBeenCalled();
    });

    it("400s when the first item is unusable", async () => {
      await expect(
        service.submitListens("u1", {
          listen_type: "playing_now",
          payload: [{ track_metadata: { artist_name: "A" } }, item()],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe("item parsing", () => {
    async function parse(
      overrides: Record<string, unknown>,
      listenedAt?: number,
    ) {
      await service.submitListens("u1", {
        payload: [item(overrides, listenedAt) as never],
      });
      return firstMeta();
    }

    it("trims names and blanks an empty release", async () => {
      const meta = await parse({
        artist_name: "  A  ",
        track_name: " T ",
        release_name: "   ",
      });
      expect(meta).toMatchObject({
        artistName: "A",
        trackName: "T",
        releaseName: null,
      });
    });

    it("converts listened_at seconds to a Date", async () => {
      const meta = await parse({}, 1700000000);
      expect(meta.listenedAt).toEqual(new Date(1700000000 * 1000));
    });

    it("falls back to now when listened_at is absent", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-02T03:04:05Z"));
      await service.submitListens("u1", {
        payload: [{ track_metadata: { artist_name: "A", track_name: "T" } }],
      });
      expect(firstMeta().listenedAt).toEqual(new Date("2026-01-02T03:04:05Z"));
    });

    it("maps identifiers and client fields", async () => {
      const meta = await parse({
        release_name: "R",
        additional_info: {
          recording_mbid: "rec",
          track_mbid: "trk",
          release_mbid: "rel",
          artist_mbids: ["a1", 5, "a2"],
          isrc: "ISRC1",
          tags: ["rock", null, "pop"],
          media_player: "mpv",
          submission_client: "ms",
          music_service: "spotify.com",
        },
      });
      expect(meta).toMatchObject({
        releaseName: "R",
        recordingMbid: "rec",
        trackMbid: "trk",
        releaseMbid: "rel",
        artistMbids: ["a1", "a2"],
        isrc: "ISRC1",
        tags: ["rock", "pop"],
        mediaPlayer: "mpv",
        submissionClient: "ms",
        musicService: "spotify.com",
      });
    });

    it("defaults optional fields when additional_info is absent", async () => {
      const meta = await parse({});
      expect(meta).toMatchObject({
        releaseName: null,
        recordingMbid: null,
        trackMbid: null,
        releaseMbid: null,
        artistMbids: [],
        isrc: null,
        spotifyId: null,
        durationMs: null,
        tags: [],
        mediaPlayer: null,
        submissionClient: null,
        musicService: null,
      });
    });

    it("drops wrongly typed optional scalars", async () => {
      const meta = await parse({
        additional_info: {
          isrc: 1,
          spotify_id: 2,
          media_player: {},
          submission_client: [],
          music_service: true,
          artist_mbids: "not-array",
          tags: "not-array",
          duration_ms: "100",
          duration: "100",
        },
      });
      expect(meta).toMatchObject({
        isrc: null,
        spotifyId: null,
        mediaPlayer: null,
        submissionClient: null,
        musicService: null,
        artistMbids: [],
        tags: [],
        durationMs: null,
      });
    });

    it.each([
      ["https://open.spotify.com/track/abc123?si=xyz", "abc123"],
      ["track/ZZ9", "ZZ9"],
      ["rawid", "rawid"],
    ])("normalizes spotify_id %s", async (spotify_id, expected) => {
      const meta = await parse({ additional_info: { spotify_id } });
      expect(meta.spotifyId).toBe(expected);
    });

    it("prefers duration_ms and converts duration seconds", async () => {
      const both = await parse({
        additional_info: { duration_ms: 1234, duration: 99 },
      });
      expect(both.durationMs).toBe(1234);
      upsertListen.mockClear();
      const secs = await parse({ additional_info: { duration: 90 } });
      expect(secs.durationMs).toBe(90_000);
    });

    it("keeps the raw item for later reprocessing", async () => {
      const raw = item({ additional_info: { custom: "kept" } });
      await service.submitListens("u1", { payload: [raw as never] });
      expect(JSON.parse(firstMeta().rawPayload)).toEqual(raw);
    });
  });
});
