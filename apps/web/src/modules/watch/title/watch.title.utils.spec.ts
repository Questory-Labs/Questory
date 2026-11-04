import { describe, expect, it } from "vitest";
import type { WatchTitleDetail, WatchTitleSeason } from "@questorylabs/shared";
import { defaultSeason, formatHoursMinutes, markWatchedBody, nextUnwatched, tmdbUrl } from "./watch.title.utils";

const season = (seasonNumber: number, watched: number[], count = 3) =>
  ({
    seasonNumber,
    episodes: Array.from({ length: count }, (_, i) => ({
      episodeNumber: i + 1,
      watchCount: watched.includes(i + 1) ? 1 : 0,
    })),
  }) as unknown as WatchTitleSeason;

const show = (seasons: WatchTitleSeason[], tmdbId: number | null = 5) =>
  ({ title: { id: "t1", type: "show", tmdbId }, seasons }) as unknown as WatchTitleDetail;

describe("watch.title.utils", () => {
  it("finds the next unwatched episode after the last watched one", () => {
    expect(nextUnwatched([season(1, [1, 2, 3]), season(2, [1])])).toEqual({ seasonNumber: 2, episodeNumber: 2 });
    expect(nextUnwatched([season(1, [3])])).toBeNull();
    expect(nextUnwatched([season(0, []), season(1, [])])).toEqual({ seasonNumber: 1, episodeNumber: 1 });
    expect(nextUnwatched(undefined)).toBeNull();
  });

  it("picks a default season", () => {
    expect(defaultSeason([season(1, [1, 2, 3]), season(2, [])])).toBe(2);
    expect(defaultSeason([season(1, [1, 2, 3]), season(2, [1, 2, 3])])).toBe(2);
    expect(defaultSeason([])).toBeNull();
  });

  it("builds the mark-watched body", () => {
    const now = new Date("2026-03-04T12:00:00");
    expect(markWatchedBody({ title: { id: "m", type: "movie" } } as unknown as WatchTitleDetail, now)).toMatchObject({
      titleId: "m",
      type: "movie",
    });
    expect(markWatchedBody(show([season(1, [1])]), now)).toMatchObject({
      titleId: "t1",
      type: "show",
      seasonNumber: 1,
      episodeNumber: 2,
    });
    expect(markWatchedBody(show([season(1, [1, 2, 3])]), now)).toBeNull();
  });

  it("links TMDB and splits minutes", () => {
    expect(tmdbUrl(show([]))).toBe("https://www.themoviedb.org/tv/5");
    expect(tmdbUrl(show([], null))).toBeNull();
    expect(formatHoursMinutes(135)).toEqual({ h: 2, m: 15 });
  });
});
