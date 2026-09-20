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

  it("allows shared list-provider OAuth callbacks when Watch or Read is on", () => {
    expect(matchFeatureRoute("/v1/watch/anilist/callback?code=x")).toEqual({
      domain: ["watch", "read"],
      source: "anilist",
    });
    expect(matchFeatureRoute("/v1/watch/mal/callback")).toEqual({
      domain: ["watch", "read"],
      source: "mal",
    });
  });

  it("still requires Watch for list-provider status routes", () => {
    expect(matchFeatureRoute("/v1/watch/anilist/status")).toEqual({
      domain: "watch",
      source: "anilist",
    });
  });

  it("allows shared list-provider HTTP cron when Watch or Read is on", () => {
    expect(matchFeatureRoute("/v1/watch/internal/cron/anilist-sync")).toEqual({
      domain: ["watch", "read"],
      source: "anilist",
    });
    expect(matchFeatureRoute("/v1/watch/internal/cron/kitsu-sync")).toEqual({
      domain: ["watch", "read"],
      source: "kitsu",
    });
  });

  it("still requires Watch for Watch-only HTTP cron", () => {
    expect(matchFeatureRoute("/v1/watch/internal/cron/letterboxd-scrape")).toEqual({
      domain: "watch",
    });
    expect(matchFeatureRoute("/v1/watch/internal/cron/trakt-sync")).toEqual({
      domain: "watch",
    });
  });
});
