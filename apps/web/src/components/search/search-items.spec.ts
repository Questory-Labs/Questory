import { describe, expect, it } from "vitest";
import type { SearchResult } from "@questorylabs/shared";
import {
  formatPlaytimeTotal,
  groupSearchItems,
  isSearchEmpty,
  searchAbbr,
  searchResultItems,
} from "./search-items";

const now = new Date("2026-10-27T12:00:00.000Z");

const empty: SearchResult = {
  games: [],
  friends: [],
  developers: [],
  publishers: [],
  collections: [],
  music: { artists: [], albums: [], tracks: [] },
  watch: { movies: [], shows: [] },
  read: { titles: [] },
};

describe("searchResultItems", () => {
  it("adds last played, status and playtime to game hits", () => {
    const [item] = searchResultItems(
      {
        ...empty,
        games: [
          {
            appId: 620,
            gameId: "g2",
            name: "Portal 2",
            headerImage: null,
            source: "library",
            playtimeMinutes: 840,
            lastPlayedAt: "2026-10-27T10:00:00.000Z",
            userStatus: "finished",
          },
        ],
      },
      now,
    );
    expect(item).toMatchObject({
      label: "Portal 2",
      domain: "games",
      kind: "Library",
      meta: "Played 2h ago · Completed · 14h total",
      href: "/library/g2",
    });
  });

  it("adds play counts to track hits", () => {
    const items = searchResultItems({
      ...empty,
      music: {
        artists: [],
        albums: [],
        tracks: [{ id: "t1", name: "Still Alive", artistName: "Jonathan Coulton", playCount: 4 }],
      },
    });
    expect(items[0]).toMatchObject({ kind: "Track", meta: "Jonathan Coulton · 4 plays" });
  });

  it("omits meta parts that have no data", () => {
    const [item] = searchResultItems({
      ...empty,
      games: [{ appId: 1, name: "Hades", headerImage: null, source: "catalog" }],
    });
    expect(item!.meta).toBeUndefined();
    expect(item!.kind).toBe("Catalog");
  });
});

describe("helpers", () => {
  it("formats playtime totals", () => {
    expect(formatPlaytimeTotal(0)).toBeNull();
    expect(formatPlaytimeTotal(40)).toBe("40m total");
    expect(formatPlaytimeTotal(90)).toBe("1.5h total");
    expect(formatPlaytimeTotal(840)).toBe("14h total");
  });

  it("builds abbreviations", () => {
    expect(searchAbbr("Portal 2")).toBe("P2");
    expect(searchAbbr("Portal")).toBe("PO");
  });

  it("groups in order and detects empty results", () => {
    const groups = groupSearchItems([
      { group: "Games", id: 1 },
      { group: "Tracks", id: 2 },
      { group: "Games", id: 3 },
    ]);
    expect(groups.map(([g, list]) => [g, list.length])).toEqual([
      ["Games", 2],
      ["Tracks", 1],
    ]);
    expect(isSearchEmpty(empty)).toBe(true);
    expect(isSearchEmpty({ ...empty, developers: ["Valve"] })).toBe(false);
    expect(isSearchEmpty(undefined)).toBe(true);
  });
});
