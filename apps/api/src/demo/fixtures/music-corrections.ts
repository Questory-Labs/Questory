import type {
  MusicCatalogSuggestResponse,
  MusicCorrectionForm,
} from "@questorylabs/shared";
import {
  DEMO_ALBUMS,
  DEMO_ARTISTS,
  DEMO_TRACKS,
  albumByIdOrFirst,
  artistByIdOrFirst,
  artistOf,
  featuredOf,
  trackByIdOrFirst,
  type DemoTrack,
} from "./music-catalog";
import { listensOfTrack } from "./music-detail";
import { releaseTitleOf, type DemoListen } from "./music-log";

const SUGGEST_MAX = 25;
const MAX_QUERY_LENGTH = 100;

function artistRefs(track: DemoTrack) {
  return [artistOf(track), ...featuredOf(track)].map((a) => ({
    id: a.id,
    name: a.name,
  }));
}

export function musicTrackCorrection(
  allListens: DemoListen[],
  id: string | undefined,
): MusicCorrectionForm {
  const track = trackByIdOrFirst(id);
  const albumTitle = releaseTitleOf(track);
  return {
    kind: "track",
    original: {
      title: track.title,
      artistName: artistOf(track).name,
      albumTitle,
    },
    current: {
      title: track.title,
      displayName: null,
      artistCredit: null,
      artists: artistRefs(track),
      albumTitle,
      albumId: track.albumId,
    },
    hasRule: false,
    sourceListenCount: listensOfTrack(allListens, track).length,
  } satisfies MusicCorrectionForm;
}

export function musicAlbumCorrection(id: string | undefined): MusicCorrectionForm {
  const album = albumByIdOrFirst(id);
  const artist = artistByIdOrFirst(album.artistId);
  return {
    kind: "album",
    original: {
      title: album.title,
      artistName: artist.name,
      albumTitle: album.title,
    },
    current: {
      title: album.title,
      displayName: null,
      artists: [{ id: artist.id, name: artist.name }],
      albumTitle: album.title,
      albumId: album.id,
    },
    hasRule: false,
  } satisfies MusicCorrectionForm;
}

export function musicArtistCorrection(id: string | undefined): MusicCorrectionForm {
  const artist = artistByIdOrFirst(id);
  return {
    kind: "artist",
    original: { artistName: artist.name },
    current: {
      displayName: null,
      artists: [{ id: artist.id, name: artist.name }],
    },
    hasRule: false,
  } satisfies MusicCorrectionForm;
}

function suggestPool(kind: unknown): Array<{ id: string; name: string }> {
  if (kind === "album") {
    return DEMO_ALBUMS.map((a) => ({ id: a.id, name: a.title }));
  }
  if (kind === "track") {
    return DEMO_TRACKS.map((t) => ({ id: t.id, name: t.title }));
  }
  return DEMO_ARTISTS.map((a) => ({ id: a.id, name: a.name }));
}

export function musicCatalogSuggest(
  kind: unknown,
  rawQuery: string | undefined,
  limit: number,
): MusicCatalogSuggestResponse {
  const query = rawQuery?.trim().slice(0, MAX_QUERY_LENGTH) ?? "";
  const needle = query.toLowerCase();
  const pool = suggestPool(kind)
    .filter((row) => row.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));
  const hasExact = pool.some((row) => row.name.toLowerCase() === needle);
  const items =
    query && !hasExact ? [{ name: query, isNew: true }, ...pool] : pool;
  return {
    items: items.slice(0, Math.min(limit, SUGGEST_MAX)),
  } satisfies MusicCatalogSuggestResponse;
}
