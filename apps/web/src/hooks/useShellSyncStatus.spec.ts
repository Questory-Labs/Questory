import { describe, expect, it } from "vitest";
import { isSteamShellActive } from "./useShellSyncStatus";

describe("isSteamShellActive", () => {
  it("treats a missing steam block as inactive", () => {
    expect(isSteamShellActive(undefined)).toBe(false);
    expect(isSteamShellActive({})).toBe(false);
    expect(isSteamShellActive({ music: null, watch: null, read: null })).toBe(
      false,
    );
  });

  it("reads steam.active when present", () => {
    expect(
      isSteamShellActive({ steam: { active: true, jobs: [] } }),
    ).toBe(true);
    expect(
      isSteamShellActive({ steam: { active: false, jobs: [] } }),
    ).toBe(false);
  });
});
