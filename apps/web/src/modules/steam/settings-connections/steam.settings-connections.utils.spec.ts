import { describe, expect, it } from "vitest";
import {
  countOn,
  domainPills,
  gamesPills,
  providerLabel,
} from "./steam.settings-connections.utils";

describe("providerLabel", () => {
  it("maps known providers and falls back to the raw id", () => {
    expect(providerLabel("mal")).toBe("MyAnimeList");
    expect(providerLabel("newthing")).toBe("newthing");
  });
});

describe("domainPills", () => {
  it("marks connected, errored and missing providers", () => {
    const pills = domainPills({
      domain: "watch",
      connected: 2,
      providers: [
        { provider: "trakt", kind: "connection", connected: true, lastSyncedAt: null, lastError: null, account: null },
        { provider: "anilist", kind: "connection", connected: true, lastSyncedAt: null, lastError: "auth_failed", account: null },
        { provider: "watch_webhook", kind: "api_key", connected: false, lastSyncedAt: null, lastError: null, account: null },
      ],
    });
    expect(pills.map((p) => p.state)).toEqual(["on", "error", "off"]);
    expect(pills[2]?.label).toBe("Plex / Jellyfin webhook");
    expect(countOn(pills)).toBe(2);
    expect(domainPills(undefined)).toEqual([]);
  });
});

describe("gamesPills", () => {
  it("includes stores and the qMonitor device count when known", () => {
    expect(gamesPills({ steamConnected: true, qmonitorDeviceCount: 2 }).map((p) => [p.label, p.state])).toEqual([
      ["Steam", "on"],
      ["Epic Games", "off"],
      ["GOG", "off"],
      ["qMonitor · 2 devices", "on"],
    ]);
    expect(gamesPills({ steamConnected: false, qmonitorDeviceCount: undefined })).toHaveLength(3);
  });
});
