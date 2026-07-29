import { describe, expect, it } from "vitest";
import {
  musicServiceFromRawPayload,
  resolveMusicService,
} from "../../src/music/lib/music-service";

describe("resolveMusicService", () => {
  it("falls back to submissionClient when musicService is empty", () => {
    expect(resolveMusicService(null, "multi-scrobbler")).toBe("multi-scrobbler");
    expect(resolveMusicService("", "multi-scrobbler")).toBe("multi-scrobbler");
  });

  it("prefers musicService when set", () => {
    expect(resolveMusicService("spotify", "multi-scrobbler")).toBe("spotify");
  });
});

describe("musicServiceFromRawPayload", () => {
  it("reads additional_info from stored payloads", () => {
    const raw = JSON.stringify({
      track_metadata: {
        additional_info: {
          submission_client: "multi-scrobbler",
        },
      },
    });
    expect(musicServiceFromRawPayload(raw)).toBe("multi-scrobbler");
  });
});
