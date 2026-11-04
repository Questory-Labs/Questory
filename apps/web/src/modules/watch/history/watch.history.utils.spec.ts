import { describe, expect, it } from "vitest";
import type { WatchRecentEvent } from "@questorylabs/shared";
import { watchEventDate, watchEventKind, watchEventMeta, watchEventTitle, watchHistoryQuery } from "./watch.history.utils";

const event = (over: Partial<WatchRecentEvent> = {}) =>
  ({
    id: "e1",
    watchedAt: "2026-08-01T20:00:00.000Z",
    source: "trakt",
    precision: "exact",
    title: { id: "t1", name: "Severance", type: "show" },
    episode: { seasonNumber: 2, episodeNumber: 3 },
    ...over,
  }) as unknown as WatchRecentEvent;

describe("watch.history.utils", () => {
  it("builds the query with optional type and search", () => {
    expect(watchHistoryQuery(2, 20, "all", "")).toBe("page=2&pageSize=20");
    expect(watchHistoryQuery(1, 10, "movie", "no body")).toBe("page=1&pageSize=10&type=movie&q=no+body");
  });

  it("titles episodes and movies", () => {
    expect(watchEventTitle(event())).toBe("Severance · S2 E3");
    expect(watchEventTitle(event({ episode: null }))).toBe("Severance");
  });

  it("labels kind and meta", () => {
    expect(watchEventKind(event())).toBe("TV");
    expect(watchEventKind(event({ title: { id: "t", name: "N", type: "movie" } } as never))).toBe("Movie");
    expect(watchEventMeta(event())).toBe("Trakt · exact time");
  });

  it("includes time only for exact precision", () => {
    expect(watchEventDate(event())).not.toBe(watchEventDate(event({ precision: "day" } as never)));
  });
});
