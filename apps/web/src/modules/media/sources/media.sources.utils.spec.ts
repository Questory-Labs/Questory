import { describe, expect, it } from "vitest";
import { pickSourcesTab, sourcesFlash, sourcesHref, sourcesTabs } from "./media.sources.utils";

describe("sourcesTabs", () => {
  it("keeps only enabled modules in a stable order", () => {
    expect(sourcesTabs({ music: false, watch: true, read: true }).map((t) => t.value)).toEqual([
      "watch",
      "read",
    ]);
  });
});

describe("pickSourcesTab", () => {
  const tabs = sourcesTabs({ music: true, watch: true, read: false });

  it("honours a requested enabled tab", () => {
    expect(pickSourcesTab("watch", tabs)).toBe("watch");
  });

  it("falls back to the first enabled tab for unknown or disabled requests", () => {
    expect(pickSourcesTab("read", tabs)).toBe("music");
    expect(pickSourcesTab(null, tabs)).toBe("music");
  });

  it("returns null when nothing is enabled", () => {
    expect(pickSourcesTab("music", [])).toBeNull();
  });
});

describe("sourcesFlash", () => {
  it("reads connected and error results for OAuth providers", () => {
    const params = new URLSearchParams("tab=watch&trakt=connected&mal=error&reason=denied&lastfm=connected");
    expect(sourcesFlash(params)).toEqual([
      { provider: "trakt", ok: true, text: "Trakt connected." },
      { provider: "mal", ok: false, text: "Could not connect MyAnimeList: denied." },
    ]);
  });

  it("ignores unknown values", () => {
    expect(sourcesFlash(new URLSearchParams("anilist=maybe"))).toEqual([]);
  });
});

describe("sourcesHref", () => {
  it("sets the tab and preserves other query params", () => {
    expect(sourcesHref("music", { tab: "read", lastfm: "error", reason: "denied", x: ["1", "2"] })).toBe(
      "/sources?tab=music&lastfm=error&reason=denied&x=1&x=2",
    );
  });

  it("works without params", () => {
    expect(sourcesHref("read")).toBe("/sources?tab=read");
  });
});
