import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListenBrainzService } from "../../src/music/listenbrainz/listenbrainz.service";

const upsertListen = vi.fn();
const enqueueTrack = vi.fn();
const submit = vi.fn();
const clear = vi.fn();

const good = {
  listened_at: 1700000000,
  track_metadata: { artist_name: "Artist", track_name: "Track" },
};

function firstMeta() {
  return upsertListen.mock.calls[0][1];
}

describe("ListenBrainzService submit validation", () => {
  let service: ListenBrainzService;

  beforeEach(() => {
    for (const fn of [upsertListen, enqueueTrack, submit, clear]) fn.mockReset();
    upsertListen.mockResolvedValue({ track: { id: "t1" } });
    enqueueTrack.mockResolvedValue(undefined);
    service = new ListenBrainzService(
      {} as never,
      { upsertListen } as never,
      { enqueueTrack } as never,
      { submit, clear } as never,
      {} as never,
    );
  });

  describe("malformed bodies", () => {
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["a string", "nope"],
      ["an array", [good]],
      ["numeric listen_type", { listen_type: 5, payload: [good] }],
    ])("400s %s", async (_name, body) => {
      const err = await service.submitListens("u1", body).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({
        code: 400,
        error: "Invalid request body",
      });
      expect(upsertListen).not.toHaveBeenCalled();
    });
  });

  describe("whole-batch validation", () => {
    const badRows: [string, unknown][] = [
      ["null row", null],
      ["string row", "nope"],
      ["no track_metadata", { listened_at: 1 }],
      ["blank artist", { track_metadata: { artist_name: "  ", track_name: "T" } }],
      ["blank track", { track_metadata: { artist_name: "A", track_name: "" } }],
      ["missing artist", { track_metadata: { track_name: "T" } }],
      ["missing track", { track_metadata: { artist_name: "A" } }],
      ["numeric artist", { track_metadata: { artist_name: 123, track_name: "T" } }],
      ["numeric track", { track_metadata: { artist_name: "A", track_name: 123 } }],
      [
        "numeric release",
        { track_metadata: { artist_name: "A", track_name: "T", release_name: 123 } },
      ],
      [
        "non-object additional_info",
        { track_metadata: { artist_name: "A", track_name: "T", additional_info: "x" } },
      ],
      ["out-of-range timestamp", { ...good, listened_at: 1e20 }],
      ["non-numeric timestamp", { ...good, listened_at: "soon" }],
      ["object timestamp", { ...good, listened_at: {} }],
    ];

    it.each(badRows)("rejects the batch for %s and writes nothing", async (_name, bad) => {
      const err = await service
        .submitListens("u1", { listen_type: "import", payload: [good, bad, good] })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({
        code: 400,
        error: "Invalid listen at payload index 1",
      });
      expect(upsertListen).not.toHaveBeenCalled();
      expect(enqueueTrack).not.toHaveBeenCalled();
    });

    it("does not clear playing-now when a single scrobble is rejected", async () => {
      await expect(
        service.submitListens("u1", { listen_type: "single", payload: [null] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(clear).not.toHaveBeenCalled();
    });

    it("400s an unusable playing_now row", async () => {
      await expect(
        service.submitListens("u1", { listen_type: "playing_now", payload: [null] }),
      ).rejects.toMatchObject({
        response: { code: 400, error: "Invalid playing_now payload" },
      });
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe("client compatibility", () => {
    it("accepts a full payload with unknown extras at every level", async () => {
      const row = {
        listened_at: 1700000000,
        inserted_at: 1700000001,
        user_name: "rj",
        track_metadata: {
          artist_name: "Artist",
          track_name: "Track",
          release_name: "Release",
          mbid_mapping: { recording_mbid: "x" },
          additional_info: {
            artist_mbids: ["a1"],
            recording_mbid: "rec",
            release_mbid: "rel",
            tracknumber: 3,
            discnumber: "1",
            origin_url: "https://example.com/t",
            submission_client: "Navidrome",
            submission_client_version: "0.50",
            nested: { anything: [1, 2] },
          },
        },
      };
      await expect(
        service.submitListens("u1", { listen_type: "single", payload: [row] }),
      ).resolves.toEqual({ status: "ok", accepted: 1 });
      expect(firstMeta()).toMatchObject({
        recordingMbid: "rec",
        submissionClient: "Navidrome",
      });
      expect(JSON.parse(firstMeta().rawPayload)).toEqual(row);
    });

    it("accepts the minimal payload", async () => {
      await expect(
        service.submitListens("u1", {
          payload: [{ track_metadata: { artist_name: "A", track_name: "T" } }],
        }),
      ).resolves.toEqual({ status: "ok", accepted: 1 });
    });

    it.each([
      ["null listen_type", { listen_type: null, payload: [good] }],
      ["null listened_at", { payload: [{ ...good, listened_at: null }] }],
      [
        "null release and additional_info",
        {
          payload: [
            {
              track_metadata: {
                artist_name: "A",
                track_name: "T",
                release_name: null,
                additional_info: null,
              },
            },
          ],
        },
      ],
    ])("still accepts %s", async (_name, body) => {
      await expect(service.submitListens("u1", body)).resolves.toEqual({
        status: "ok",
        accepted: 1,
      });
    });

    it("still accepts a numeric-string listened_at", async () => {
      await service.submitListens("u1", {
        payload: [{ ...good, listened_at: "1700000000" }],
      });
      expect(firstMeta().listenedAt).toEqual(new Date(1700000000 * 1000));
    });

    it("ignores trailing rows and timestamps for playing_now", async () => {
      await expect(
        service.submitListens("u1", {
          listen_type: "playing_now",
          payload: [{ ...good, listened_at: "soon" }, null],
        }),
      ).resolves.toEqual({ status: "ok" });
      expect(submit).toHaveBeenCalledTimes(1);
    });
  });

  describe("optional field coercion", () => {
    async function parseInfo(additional_info: Record<string, unknown>) {
      await service.submitListens("u1", {
        payload: [
          {
            ...good,
            track_metadata: { ...good.track_metadata, additional_info },
          },
        ],
      });
      return firstMeta();
    }

    it("nulls non-string MBIDs instead of passing them to the database", async () => {
      const meta = await parseInfo({
        recording_mbid: { x: 1 },
        track_mbid: 7,
        release_mbid: ["r"],
      });
      expect(meta).toMatchObject({
        recordingMbid: null,
        trackMbid: null,
        releaseMbid: null,
      });
    });

    it("nulls empty MBIDs", async () => {
      const meta = await parseInfo({ recording_mbid: "" });
      expect(meta.recordingMbid).toBeNull();
    });

    it.each([
      [{ duration_ms: 1234.6 }, 1235],
      [{ duration: 123.4 }, 123400],
      [{ duration_ms: 0 }, 0],
      [{ duration_ms: -1 }, null],
      [{ duration_ms: 3_000_000_000 }, null],
      [{ duration: 3_000_000 }, null],
    ])("stores duration %j as an Int-safe %s", async (info, expected) => {
      const meta = await parseInfo(info);
      expect(meta.durationMs).toBe(expected);
    });
  });

  describe("enrichment enqueue", () => {
    it("does not fail the scrobble or leak a rejection when enqueue fails", async () => {
      enqueueTrack.mockRejectedValue(new Error("db down"));
      await expect(
        service.submitListens("u1", { payload: [good] }),
      ).resolves.toEqual({ status: "ok", accepted: 1 });
      await new Promise((resolve) => setImmediate(resolve));
      expect(enqueueTrack).toHaveBeenCalledWith("t1");
    });
  });
});
