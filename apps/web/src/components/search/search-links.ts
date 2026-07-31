import type { SearchResult } from "@questorylabs/shared";

export function gameSearchHref(game: SearchResult["games"][number]): string {
  if (game.gameId) return `/library/${game.gameId}`;
  if (game.appId > 0) return `/library?search=${encodeURIComponent(game.name)}`;
  return `/search?q=${encodeURIComponent(game.name)}`;
}

export function friendSearchHref(steamId: string): string {
  return `/friends/${steamId}`;
}

export function collectionSearchHref(id: string): string {
  return `/collections/${id}`;
}

export function musicArtistHref(id: string): string {
  return `/music/artists/${id}`;
}

export function musicAlbumHref(id: string): string {
  return `/music/albums/${id}`;
}

export function musicTrackHref(id: string): string {
  return `/music/tracks/${id}`;
}

export function watchTitleHref(id: string): string {
  return `/watch/titles/${id}`;
}

export function readTitleHref(id: string): string {
  return `/read/titles/${id}`;
}
