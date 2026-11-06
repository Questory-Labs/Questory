import {
  ARTIST_SEEDS,
  FEATURED_ONLY,
  type ArtistSeed,
  type TrackSeed,
} from "./music-catalog-data";

export type DemoGenre = {
  id: string;
  name: string;
  slug: string;
  kind: "genre" | "mood";
};

export type DemoArtist = {
  id: string;
  name: string;
  genres: DemoGenre[];
  weight: number;
  phase: number;
  firstDayOffset: number | null;
  lastDayOffset: number | null;
};

export type DemoAlbum = {
  id: string;
  title: string;
  artistId: string;
  year: number;
};

export type DemoTrack = {
  id: string;
  title: string;
  artistId: string;
  featuredIds: string[];
  albumId: string | null;
  durationMs: number;
  genres: DemoGenre[];
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const genreIndex = new Map<string, DemoGenre>();

function genreFor(name: string, kind: DemoGenre["kind"]): DemoGenre {
  const slug = slugify(name);
  const key = `${kind}:${slug}`;
  const existing = genreIndex.get(key);
  if (existing) return existing;
  const genre: DemoGenre = { id: `demo-${kind}-${slug}`, name, slug, kind };
  genreIndex.set(key, genre);
  return genre;
}

function artistId(name: string): string {
  return `demo-artist-${slugify(name)}`;
}

function buildTrack(
  seed: ArtistSeed,
  albumId: string | null,
  moods: string[],
  track: TrackSeed,
): DemoTrack {
  const [title, durationMs, featured] = track;
  return {
    id: `demo-track-${slugify(seed.name)}-${slugify(title)}`,
    title,
    artistId: artistId(seed.name),
    featuredIds: (featured ?? []).map(artistId),
    albumId,
    durationMs,
    genres: [
      ...seed.genres.map((g) => genreFor(g, "genre")),
      ...moods.map((m) => genreFor(m, "mood")),
    ],
  };
}

export const DEMO_ARTISTS: DemoArtist[] = [
  ...ARTIST_SEEDS.map((seed) => ({
    id: artistId(seed.name),
    name: seed.name,
    genres: seed.genres.map((g) => genreFor(g, "genre")),
    weight: seed.weight,
    phase: seed.phase,
    firstDayOffset: seed.firstDayOffset ?? null,
    lastDayOffset: seed.lastDayOffset ?? null,
  })),
  ...FEATURED_ONLY.map((name) => ({
    id: artistId(name),
    name,
    genres: [],
    weight: 0,
    phase: 0,
    firstDayOffset: null,
    lastDayOffset: null,
  })),
];

export const DEMO_ALBUMS: DemoAlbum[] = ARTIST_SEEDS.flatMap((seed) =>
  seed.albums.map((album) => ({
    id: `demo-album-${slugify(album.title)}`,
    title: album.title,
    artistId: artistId(seed.name),
    year: album.year,
  })),
);

export const DEMO_TRACKS: DemoTrack[] = ARTIST_SEEDS.flatMap((seed) => [
  ...seed.albums.flatMap((album) =>
    album.tracks.map((track) =>
      buildTrack(seed, `demo-album-${slugify(album.title)}`, album.moods, track),
    ),
  ),
  ...(seed.singles ?? []).map((single) =>
    buildTrack(seed, null, single.moods, single.track),
  ),
]);

export const ARTISTS_BY_ID = new Map(DEMO_ARTISTS.map((a) => [a.id, a]));
export const ALBUMS_BY_ID = new Map(DEMO_ALBUMS.map((a) => [a.id, a]));
export const TRACKS_BY_ID = new Map(DEMO_TRACKS.map((t) => [t.id, t]));

export function artistOf(track: DemoTrack): DemoArtist {
  return ARTISTS_BY_ID.get(track.artistId) ?? DEMO_ARTISTS[0]!;
}

export function albumOf(track: DemoTrack): DemoAlbum | null {
  return track.albumId ? (ALBUMS_BY_ID.get(track.albumId) ?? null) : null;
}

export function featuredOf(track: DemoTrack): DemoArtist[] {
  return track.featuredIds.flatMap((id) => {
    const artist = ARTISTS_BY_ID.get(id);
    return artist ? [artist] : [];
  });
}

export function trackByIdOrFirst(id: string | undefined): DemoTrack {
  return (id ? TRACKS_BY_ID.get(id) : undefined) ?? DEMO_TRACKS[0]!;
}

export function artistByIdOrFirst(id: string | undefined): DemoArtist {
  return (id ? ARTISTS_BY_ID.get(id) : undefined) ?? DEMO_ARTISTS[0]!;
}

export function albumByIdOrFirst(id: string | undefined): DemoAlbum {
  return (id ? ALBUMS_BY_ID.get(id) : undefined) ?? DEMO_ALBUMS[0]!;
}

export function artistCredits(): Map<string, string> {
  const credits = new Map<string, string>();
  for (const track of DEMO_TRACKS) {
    const featured = featuredOf(track);
    if (featured.length === 0) continue;
    credits.set(
      track.id,
      `${artistOf(track).name} feat. ${featured.map((a) => a.name).join(" & ")}`,
    );
  }
  return credits;
}
