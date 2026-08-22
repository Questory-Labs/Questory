import { describe, expect, it } from "vitest";
import {
  includeFromFile,
  kindFromFileName,
  watchLiveSourceState,
} from "./watch.settings.utils";

describe("watch.settings.utils", () => {
  it("maps Letterboxd filenames to kinds", () => {
    expect(kindFromFileName("diary.csv")).toBe("diary");
    expect(kindFromFileName("C:\\\\exports\\\\ratings.csv")).toBe("ratings");
    expect(kindFromFileName("other.txt")).toBeNull();
  });

  it("selects a single CSV kind and defaults zip includes", () => {
    const csv = { name: "watched.csv", type: "text/csv" } as File;
    expect(includeFromFile(csv)).toEqual({
      diary: false,
      ratings: false,
      watched: true,
      watchlist: false,
    });
    const zip = { name: "letterboxd.zip", type: "application/zip" } as File;
    expect(includeFromFile(zip).diary).toBe(true);
    expect(includeFromFile(zip).watched).toBe(false);
  });

  it("shows unused live sources until expanded", () => {
    const idle = watchLiveSourceState({
      traktConnected: false,
      anilistConnected: false,
      webhookActive: false,
      expanded: {},
    });
    expect(idle.showingLive).toBe(false);
    expect(idle.chooserOptions.map((o) => o.id)).toEqual([
      "trakt",
      "anilist",
      "webhook",
    ]);

    const expanded = watchLiveSourceState({
      traktConnected: false,
      anilistConnected: false,
      webhookActive: false,
      expanded: { trakt: true },
    });
    expect(expanded.showTrakt).toBe(true);
    expect(expanded.chooserOptions.map((o) => o.id)).toEqual([
      "anilist",
      "webhook",
    ]);
  });
});
