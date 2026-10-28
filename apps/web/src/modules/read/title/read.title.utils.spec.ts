import { describe, expect, it } from "vitest";
import type { ReadTitleDetail } from "@questorylabs/shared";
import { anilistMangaUrl, chaptersLeft, nextChapter, paceText, progressSummary } from "./read.title.utils";

const detail = (over: Record<string, unknown> = {}, chapters: number | null = 10) =>
  ({ progressChapters: 4, progressVolumes: 0, score: null, pace: null, ...over, title: { chapters } }) as unknown as ReadTitleDetail;

describe("read.title.utils", () => {
  it("counts chapters left and the next chapter", () => {
    expect(chaptersLeft(detail())).toBe(6);
    expect(chaptersLeft(detail({}, null))).toBeNull();
    expect(nextChapter(detail())).toBe(5);
    expect(nextChapter(detail({ progressChapters: 10 }))).toBeNull();
    expect(nextChapter(detail({}, null))).toBe(5);
  });

  it("writes pace text", () => {
    expect(paceText(detail({ progressChapters: 10 }))).toBeNull();
    expect(paceText(detail())).toBe("About 6 chapters left.");
    expect(paceText(detail({ pace: { chaptersPerWeek: 3, weeksToFinish: 2 } }), new Date("2026-01-01T00:00:00Z"))).toMatch(
      /^About 6 chapters left\. At your pace, done by around /,
    );
  });

  it("links AniList and summarises progress", () => {
    expect(anilistMangaUrl(7)).toBe("https://anilist.co/manga/7");
    expect(anilistMangaUrl(null)).toBeNull();
    expect(progressSummary(detail({ progressVolumes: 2, score: 9 }))).toBe("Vol. 2 · Score 9");
    expect(progressSummary(detail())).toBe("");
  });
});
