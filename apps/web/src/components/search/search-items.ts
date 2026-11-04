import type { SearchGameHit, SearchMusicTrackHit, SearchResult } from "@questorylabs/shared";
import { formatRelativePlayed } from "@/lib/dates";
import {
  collectionSearchHref,
  friendSearchHref,
  gameSearchHref,
  musicAlbumHref,
  musicArtistHref,
  musicTrackHref,
  readTitleHref,
  watchTitleHref,
} from "./search-links";
import { normalizeSearchResult } from "./normalize-search-result";
import {
  SEARCH_SOURCE_LABEL,
  SEARCH_USER_STATUS_LABEL,
  type SearchDomain,
} from "./search.constants";

export type SearchItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  domain: SearchDomain;
  kind: string;
  meta?: string;
  image?: string | null;
};

const join = (parts: Array<string | null | undefined | false>) =>
  parts.filter(Boolean).join(" · ") || undefined;

export const formatPlaytimeTotal = (minutes: number | undefined) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m total`;
  const hours = minutes / 60;
  return `${hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10}h total`;
};

export const gameHitMeta = (g: SearchGameHit, now = new Date()) =>
  join([
    g.lastPlayedAt ? `Played ${formatRelativePlayed(g.lastPlayedAt, now)}` : null,
    g.userStatus ? SEARCH_USER_STATUS_LABEL[g.userStatus] ?? g.userStatus : null,
    formatPlaytimeTotal(g.playtimeMinutes),
  ]);

export const trackHitMeta = (t: SearchMusicTrackHit) =>
  join([
    t.artistName,
    t.albumName,
    t.playCount ? `${t.playCount} play${t.playCount === 1 ? "" : "s"}` : null,
  ]);

export function searchResultItems(data: SearchResult | undefined, now = new Date()): SearchItem[] {
  const n = normalizeSearchResult(data);
  if (!n) return [];
  return [
    ...n.games.map<SearchItem>((g) => ({
      id: `game-${g.source}-${g.appId}`,
      label: g.name,
      href: gameSearchHref(g),
      group: "Games",
      domain: "games",
      kind: SEARCH_SOURCE_LABEL[g.source] ?? g.source,
      meta: gameHitMeta(g, now),
      image: g.headerImage,
    })),
    ...n.friends.map<SearchItem>((f) => ({
      id: `friend-${f.steamId}`,
      label: f.personaName,
      href: friendSearchHref(f.steamId),
      group: "Friends",
      domain: "friends",
      kind: "Friend",
      image: f.avatarUrl,
    })),
    ...n.music.artists.map<SearchItem>((a) => ({
      id: `artist-${a.id}`,
      label: a.name,
      href: musicArtistHref(a.id),
      group: "Artists",
      domain: "music",
      kind: "Artist",
    })),
    ...n.music.albums.map<SearchItem>((a) => ({
      id: `album-${a.id}`,
      label: a.name,
      href: musicAlbumHref(a.id),
      group: "Albums",
      domain: "music",
      kind: "Album",
      meta: a.artistName ?? undefined,
    })),
    ...n.music.tracks.map<SearchItem>((t) => ({
      id: `track-${t.id}`,
      label: t.name,
      href: musicTrackHref(t.id),
      group: "Tracks",
      domain: "music",
      kind: "Track",
      meta: trackHitMeta(t),
    })),
    ...n.watch.movies.map<SearchItem>((m) => ({
      id: `movie-${m.id}`,
      label: m.name,
      href: watchTitleHref(m.id),
      group: "Movies",
      domain: "watch",
      kind: "Movie",
      meta: m.year ? String(m.year) : undefined,
      image: m.posterUrl,
    })),
    ...n.watch.shows.map<SearchItem>((s) => ({
      id: `show-${s.id}`,
      label: s.name,
      href: watchTitleHref(s.id),
      group: "Shows",
      domain: "watch",
      kind: "Show",
      meta: s.year ? String(s.year) : undefined,
      image: s.posterUrl,
    })),
    ...n.read.titles.map<SearchItem>((t) => ({
      id: `read-${t.id}`,
      label: t.name,
      href: readTitleHref(t.id),
      group: "Reads",
      domain: "read",
      kind: t.format,
      meta: join([t.format, t.listStatus]),
      image: t.coverUrl,
    })),
    ...n.collections.map<SearchItem>((c) => ({
      id: `collection-${c.id}`,
      label: c.name,
      href: collectionSearchHref(c.id),
      group: "Collections",
      domain: "games",
      kind: "Collection",
      meta: `${c.gameCount} games`,
    })),
  ];
}

export function isSearchEmpty(data: SearchResult | undefined): boolean {
  const n = normalizeSearchResult(data);
  if (!n) return true;
  return searchResultItems(n).length === 0 && n.developers.length === 0 && n.publishers.length === 0;
}

export function groupSearchItems<T extends { group: string }>(items: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()];
}

export const searchAbbr = (label: string) => {
  const words = label.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return label.slice(0, 1).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
};
