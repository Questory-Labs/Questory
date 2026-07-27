import { describe, expect, it } from "vitest";
import { API_PREFIX, API_VERSION, withApiVersion } from "./index";

describe("API version helpers", () => {
  it("exports v1 prefix", () => {
    expect(API_VERSION).toBe("1");
    expect(API_PREFIX).toBe("/v1");
  });

  it("prefixes resource paths", () => {
    expect(withApiVersion("/library")).toBe("/v1/library");
    expect(withApiVersion("library")).toBe("/v1/library");
  });

  it("skips already-versioned paths", () => {
    expect(withApiVersion("/v1/library")).toBe("/v1/library");
    expect(withApiVersion("/v2/library")).toBe("/v2/library");
  });

  it("skips neutral prefixes", () => {
    expect(withApiVersion("/auth/me", ["/auth", "/health"])).toBe("/auth/me");
    expect(withApiVersion("/health", ["/auth", "/health"])).toBe("/health");
    expect(withApiVersion("/1/submit-listens", ["/health", "/1", "/apis"])).toBe(
      "/1/submit-listens",
    );
    expect(
      withApiVersion("/apis/listenbrainz/1/validate-token", [
        "/health",
        "/1",
        "/apis",
      ]),
    ).toBe("/apis/listenbrainz/1/validate-token");
    expect(withApiVersion("/webhooks/plex", ["/health", "/webhooks"])).toBe(
      "/webhooks/plex",
    );
  });
});
