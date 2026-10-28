import { describe, expect, it } from "vitest";
import type { ReadLibraryItem, SourcesOverview } from "@questorylabs/shared";
import { dayPartPhrase, latestReadSync, rangeLong, readingPercent, readingProgressLabel } from "./read.home.utils";

const item = (progressChapters: number, progressVolumes: number, chapters: number | null, volumes: number | null) =>
  ({ progressChapters, progressVolumes, title: { chapters, volumes } }) as unknown as ReadLibraryItem;

describe("read.home.utils", () => {
  it("describes ranges", () => {
    expect(rangeLong("month")).toBe("last 30 days");
    expect(rangeLong("all")).toBe("all time");
  });

  it("phrases the peak hour", () => {
    expect(dayPartPhrase(null)).toBeNull();
    expect(dayPartPhrase(2)).toBe("mostly past midnight");
    expect(dayPartPhrase(9)).toBe("mostly in the morning");
    expect(dayPartPhrase(14)).toBe("mostly in the afternoon");
    expect(dayPartPhrase(19)).toBe("mostly in the evening");
    expect(dayPartPhrase(23)).toBe("mostly late at night");
  });

  it("labels and measures reading progress", () => {
    expect(readingProgressLabel(item(5, 0, 20, null))).toBe("Ch. 5 / 20");
    expect(readingProgressLabel(item(5, 0, null, null))).toBe("Ch. 5");
    expect(readingProgressLabel(item(0, 2, null, 10))).toBe("Vol. 2 / 10");
    expect(readingProgressLabel(item(0, 2, null, null))).toBe("Vol. 2");
    expect(readingPercent(item(5, 0, 20, null))).toBe(25);
    expect(readingPercent(item(0, 5, null, 10))).toBe(50);
    expect(readingPercent(item(30, 0, 20, null))).toBe(100);
    expect(readingPercent(item(1, 0, null, null))).toBeNull();
  });

  it("finds the latest connected read sync", () => {
    const overview = {
      connected: 2,
      domains: [
        {
          domain: "read",
          connected: 2,
          providers: [
            { provider: "anilist", connected: true, lastSyncedAt: "2026-08-01T00:00:00.000Z" },
            { provider: "mal", connected: true, lastSyncedAt: "2026-09-01T00:00:00.000Z" },
            { provider: "kitsu", connected: false, lastSyncedAt: "2026-10-01T00:00:00.000Z" },
          ],
        },
      ],
    } as unknown as SourcesOverview;
    expect(latestReadSync(overview)).toEqual({ provider: "MyAnimeList", at: "2026-09-01T00:00:00.000Z" });
    expect(latestReadSync(null)).toBeNull();
  });
});
