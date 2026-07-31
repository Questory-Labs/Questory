import type { SearchResult } from "@questorylabs/shared";

const EMPTY_MUSIC: SearchResult["music"] = {
  artists: [],
  albums: [],
  tracks: [],
};

const EMPTY_WATCH: SearchResult["watch"] = {
  movies: [],
  shows: [],
};

const EMPTY_READ: SearchResult["read"] = {
  titles: [],
};

/** Coerce legacy/partial search payloads into the current SearchResult shape. */
export function normalizeSearchResult(
  data: Partial<SearchResult> | undefined,
): SearchResult | undefined {
  if (!data) return undefined;
  return {
    games: data.games ?? [],
    friends: data.friends ?? [],
    developers: data.developers ?? [],
    publishers: data.publishers ?? [],
    collections: data.collections ?? [],
    music: {
      artists: data.music?.artists ?? EMPTY_MUSIC.artists,
      albums: data.music?.albums ?? EMPTY_MUSIC.albums,
      tracks: data.music?.tracks ?? EMPTY_MUSIC.tracks,
    },
    watch: {
      movies: data.watch?.movies ?? EMPTY_WATCH.movies,
      shows: data.watch?.shows ?? EMPTY_WATCH.shows,
    },
    read: {
      titles: data.read?.titles ?? EMPTY_READ.titles,
    },
  };
}
