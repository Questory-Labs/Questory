import { describe, expect, it } from "vitest";
import { matchFeatureRoute } from "../../src/features/feature-http.rules";

describe("matchFeatureRoute", () => {
  it("does not gate health, status, auth, or admin", () => {
    expect(matchFeatureRoute("/health")).toBeNull();
    expect(matchFeatureRoute("/v1/status")).toBeNull();
    expect(matchFeatureRoute("/auth/me")).toBeNull();
    expect(matchFeatureRoute("/v1/admin/settings")).toBeNull();
  });

  it("gates ListenBrainz ingest on both mounts", () => {
    expect(matchFeatureRoute("/1/submit-listens")).toEqual({
      domain: "music",
      source: "listenbrainzIngest",
    });
    expect(matchFeatureRoute("/apis/listenbrainz/1/submit-listens")).toEqual({
      domain: "music",
      source: "listenbrainzIngest",
    });
  });

  it("gates watch analytics by domain only", () => {
    expect(matchFeatureRoute("/v1/watch/analytics")).toEqual({
      domain: "watch",
    });
  });

  it("gates Trakt as a source without hiding the rest of Watch", () => {
    expect(matchFeatureRoute("/v1/watch/trakt/status")).toEqual({
      domain: "watch",
      source: "trakt",
    });
  });

  it("gates plex/jellyfin webhooks", () => {
    expect(matchFeatureRoute("/webhooks/plex")).toEqual({
      domain: "watch",
      source: "watchWebhooks",
    });
  });
});
