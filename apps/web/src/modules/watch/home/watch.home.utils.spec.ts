import { describe, expect, it } from "vitest";
import type { WatchContinueItem } from "@questorylabs/shared";
import { continueNextLabel, episodeCode, typeQuery } from "./watch.home.utils";

const item = (over: Record<string, unknown> = {}) =>
  ({
    anime: false,
    watchedEpisodes: 4,
    next: { seasonNumber: 1, episodeNumber: 5 },
    title: { totalEpisodes: 10 },
    ...over,
  }) as unknown as WatchContinueItem;

describe("watch.home.utils", () => {
  it("builds the type query", () => {
    expect(typeQuery("all")).toBe("");
    expect(typeQuery("show")).toBe("&type=show");
  });

  it("formats episode codes", () => {
    expect(episodeCode(2, 3)).toBe("S2 E3");
    expect(episodeCode(0, 3)).toBe("E3");
  });

  it("labels the next episode", () => {
    expect(continueNextLabel(item())).toBe("S1 E5 next · 6 left");
    expect(continueNextLabel(item({ anime: true }))).toBe("E5 next · 6 left");
    expect(continueNextLabel(item({ title: { totalEpisodes: null } }))).toBe("S1 E5 next");
    expect(continueNextLabel(item({ next: null }))).toBe("Up to date");
  });
});
