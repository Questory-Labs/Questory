import { describe, expect, it } from "vitest";
import { normalizeSearchResult } from "./normalize-search-result";

describe("normalizeSearchResult", () => {
  it("fills missing music, watch, and read sections", () => {
    const normalized = normalizeSearchResult({
      games: [],
      friends: [],
      developers: [],
      publishers: [],
      collections: [],
    });

    expect(normalized?.music).toEqual({
      artists: [],
      albums: [],
      tracks: [],
    });
    expect(normalized?.watch).toEqual({ movies: [], shows: [] });
    expect(normalized?.read).toEqual({ titles: [] });
  });

  it("preserves populated sections", () => {
    const normalized = normalizeSearchResult({
      games: [],
      friends: [],
      developers: [],
      publishers: [],
      collections: [],
      music: {
        artists: [{ id: "a1", name: "Radiohead" }],
        albums: [],
        tracks: [],
      },
    });

    expect(normalized?.music.artists).toHaveLength(1);
  });
});
