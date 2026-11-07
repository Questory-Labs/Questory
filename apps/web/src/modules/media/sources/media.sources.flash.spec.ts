import { describe, expect, it } from "vitest";
import {
  SOURCES_ACCENT,
  SOURCES_FLASH_PROVIDERS,
  SOURCES_NOUN,
  pickSourcesTab,
  sourcesFlash,
  sourcesHref,
  sourcesTabs,
} from "./media.sources.utils";

describe("sourcesFlash providers", () => {
  it.each(Object.entries(SOURCES_FLASH_PROVIDERS))("reports %s connected", (key, label) => {
    expect(sourcesFlash(new URLSearchParams(`${key}=connected`))).toEqual([
      { provider: key, ok: true, text: `${label} connected.` },
    ]);
  });

  it.each(Object.entries(SOURCES_FLASH_PROVIDERS))("reports %s failure without a reason", (key, label) => {
    expect(sourcesFlash(new URLSearchParams(`${key}=error`))).toEqual([
      { provider: key, ok: false, text: `Could not connect ${label}.` },
    ]);
  });

  it.each([
    ["denied", "Could not connect Trakt: denied."],
    ["access_denied", "Could not connect Trakt: access denied."],
    ["missing_token", "Could not connect Trakt: the provider returned no token."],
    ["invalid_state", "Could not connect Trakt: the sign-in link is invalid or expired."],
    ["callback_failed", "Could not connect Trakt: the provider callback failed."],
  ])("maps the known reason %s", (reason, text) => {
    expect(sourcesFlash(new URLSearchParams({ trakt: "error", reason }))[0].text).toBe(text);
  });

  it.each(["Call support at evil.example", "<b>hi</b>", "constructor", "__proto__", "DENIED"])(
    "never echoes the unknown reason %s",
    (reason) => {
      expect(sourcesFlash(new URLSearchParams({ trakt: "error", reason }))[0].text).toBe(
        "Could not connect Trakt.",
      );
    },
  );

  it("treats an empty reason as absent", () => {
    expect(sourcesFlash(new URLSearchParams("trakt=error&reason="))[0].text).toBe("Could not connect Trakt.");
  });

  it("does not attach a reason to a success", () => {
    expect(sourcesFlash(new URLSearchParams("trakt=connected&reason=denied"))[0].text).toBe("Trakt connected.");
  });

  it("is empty without provider params", () => {
    expect(sourcesFlash(new URLSearchParams("tab=watch&reason=denied"))).toEqual([]);
  });

  it("orders messages by provider, not URL order", () => {
    const flash = sourcesFlash(new URLSearchParams("shikimori=connected&trakt=connected"));
    expect(flash.map((f) => f.provider)).toEqual(["trakt", "shikimori"]);
  });

  it("uses the first value of a repeated param", () => {
    expect(sourcesFlash(new URLSearchParams("trakt=error&trakt=connected"))[0].ok).toBe(false);
  });
});

describe("sourcesTabs", () => {
  it("returns labelled tabs in fixed order", () => {
    expect(sourcesTabs({ read: true, watch: true, music: true })).toEqual([
      { value: "music", label: "Music" },
      { value: "watch", label: "Watch" },
      { value: "read", label: "Read" },
    ]);
  });

  it("returns nothing when all are off", () => {
    expect(sourcesTabs({ music: false, watch: false, read: false })).toEqual([]);
  });
});

describe("pickSourcesTab", () => {
  it("is case sensitive", () => {
    expect(pickSourcesTab("WATCH", sourcesTabs({ music: true, watch: true, read: true }))).toBe("music");
  });

  it("ignores an empty request", () => {
    expect(pickSourcesTab("", sourcesTabs({ music: false, watch: true, read: true }))).toBe("watch");
  });
});

describe("sourcesHref", () => {
  it("skips undefined values and encodes the rest", () => {
    expect(sourcesHref("watch", { a: undefined, reason: "a b&c" })).toBe("/sources?tab=watch&reason=a+b%26c");
  });

  it("ignores an array tab override", () => {
    expect(sourcesHref("watch", { tab: ["read", "music"] })).toBe("/sources?tab=watch");
  });
});

describe("domain tables", () => {
  it("define an accent and noun for each domain", () => {
    for (const tab of ["music", "watch", "read"] as const) {
      expect(SOURCES_ACCENT[tab]).toBe(`var(--${tab})`);
      expect(SOURCES_NOUN[tab]).toMatch(/ing$/);
    }
  });
});
