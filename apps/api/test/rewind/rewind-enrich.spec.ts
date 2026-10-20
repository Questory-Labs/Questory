import { describe, expect, it } from "vitest";
import {
  featuredArtists,
  maxRepeatsInDay,
} from "../../src/music/analytics/rewind-enrich";
import {
  enrichWatchRewind,
  type WatchEnrichEvent,
} from "../../src/watch/analytics/rewind-enrich";
import { enrichReadRewind } from "../../src/read/analytics/rewind-enrich";

describe("music rewind enrich", () => {
  it("counts credited guests, not the primary artist", () => {
    const credits = new Map([
      ["t1", "Daft Punk feat. Pharrell Williams"],
      ["t2", "Daft Punk & Pharrell Williams"],
    ]);
    const out = featuredArtists(
      [
        { trackId: "t1", artistName: "Daft Punk" },
        { trackId: "t2", artistName: "Daft Punk" },
        { trackId: "t3", artistName: "Daft Punk" },
      ],
      credits,
    );
    expect(out).toEqual([
      { id: "credit:pharrell williams", name: "Pharrell Williams", count: 2 },
    ]);
  });

  it("finds the most repeated track in one local day", () => {
    const row = (trackId: string, iso: string) => ({
      trackId,
      listenedAt: new Date(iso),
      title: `Song ${trackId}`,
      artistName: "A",
    });
    expect(
      maxRepeatsInDay(
        [
          row("t1", "2025-01-01T10:00:00Z"),
          row("t1", "2025-01-01T11:00:00Z"),
          row("t1", "2025-01-01T12:00:00Z"),
          row("t2", "2025-01-02T10:00:00Z"),
        ],
        "UTC",
      ),
    ).toEqual({ name: "Song t1", subtitle: "A", count: 3, date: "2025-01-01" });
    expect(maxRepeatsInDay([row("t1", "2025-01-01T10:00:00Z")], "UTC")).toBeNull();
  });
});

describe("watch rewind enrich", () => {
  const ev = (over: Partial<WatchEnrichEvent>): WatchEnrichEvent => ({
    titleId: "m1",
    name: "Movie",
    type: "movie",
    imageUrl: null,
    watchedAt: new Date("2025-01-01T20:00:00Z"),
    episodeId: null,
    progress: 100,
    rating: null,
    ...over,
  });

  it("averages ratings, flags unfinished titles and binge days", () => {
    const out = enrichWatchRewind(
      [
        ev({ titleId: "m1", rating: 8 }),
        ev({ titleId: "m2", name: "Half", rating: 6, progress: 40 }),
        ev({ titleId: "s1", name: "Show", type: "show", episodeId: "e1" }),
        ev({ titleId: "s1", name: "Show", type: "show", episodeId: "e2" }),
        ev({ titleId: "s1", name: "Show", type: "show", episodeId: "e3" }),
      ],
      "UTC",
    );
    expect(out.avgRating).toBe(7);
    expect(out.ratedCount).toBe(2);
    expect(out.topRated.map((t) => t.name)).toEqual(["Movie", "Half"]);
    expect(out.unfinished.map((t) => t.name)).toEqual(["Half"]);
    expect(out.bingeRuns).toEqual([
      expect.objectContaining({ name: "Show", count: 3 }),
    ]);
  });
});

describe("read rewind enrich", () => {
  it("counts titles per status and the highest volume reached", () => {
    expect(
      enrichReadRewind([
        { readTitleId: "a", status: "COMPLETED", volumesRead: 3 },
        { readTitleId: "a", status: "COMPLETED", volumesRead: 5 },
        { readTitleId: "b", status: "DROPPED", volumesRead: null },
        { readTitleId: "c", status: "REPEATING", volumesRead: 2 },
        { readTitleId: "d", status: "CURRENT", volumesRead: null },
      ]),
    ).toEqual({
      statusBreakdown: { completed: 1, dropped: 1, repeating: 1 },
      volumesRead: 7,
    });
  });
});
