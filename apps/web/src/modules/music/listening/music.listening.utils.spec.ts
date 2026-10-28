import type { MusicRecentListen } from "@questorylabs/shared";
import { describe, expect, it } from "vitest";
import {
  dayTotalsRange,
  daySummary,
  listenSourceOf,
  mergeListens,
  recentPath,
} from "./music.listening.utils";

const DAY = 24 * 60 * 60 * 1000;

const listen = (id: string): MusicRecentListen => ({
  id,
  listenedAt: "2026-10-01T12:00:00.000Z",
  track: {
    id: `t-${id}`,
    title: id,
    artistName: "A",
    releaseTitle: null,
    imageUrl: null,
    genres: [],
  },
});

describe("music listening utils", () => {
  it("picks the smallest range covering the oldest day", () => {
    const now = new Date(2026, 9, 27, 15).getTime();
    expect(dayTotalsRange(undefined, now)).toBe("week");
    expect(dayTotalsRange(new Date(now - 2 * DAY).toISOString(), now)).toBe("week");
    expect(dayTotalsRange(new Date(now - 7 * DAY).toISOString(), now)).toBe("month");
    expect(dayTotalsRange(new Date(now - 100 * DAY).toISOString(), now)).toBe("year");
    expect(dayTotalsRange(new Date(now - 400 * DAY).toISOString(), now)).toBe("all");
  });

  it("merges listens without duplicates", () => {
    const merged = mergeListens([listen("a"), listen("b")], [listen("b"), listen("c")]);
    expect(merged.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("summarises a day bucket", () => {
    expect(daySummary(undefined)).toBeNull();
    expect(daySummary({ key: "k", label: "l", count: 1 })).toBe("1 listen");
    expect(daySummary({ key: "k", label: "l", count: 48, minutes: 182.4 })).toBe(
      "48 listens · 3h 2m",
    );
  });

  it("maps submission clients to sources", () => {
    expect(listenSourceOf("questory_lastfm")).toBe("lastfm");
    expect(listenSourceOf("spotify_import")).toBe("imports");
    expect(listenSourceOf(null)).toBe("listenbrainz");
    expect(listenSourceOf("multi-scrobbler")).toBe("listenbrainz");
  });

  it("builds the recent path with optional filters", () => {
    expect(recentPath({ page: 2, pageSize: 15, q: "", source: "all" })).toBe(
      "/analytics/recent?page=2&pageSize=15",
    );
    expect(recentPath({ page: 1, pageSize: 15, q: "a b", source: "lastfm" })).toBe(
      "/analytics/recent?page=1&pageSize=15&q=a+b&source=lastfm",
    );
  });
});
