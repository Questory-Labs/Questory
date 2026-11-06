import { albumOf, artistOf, featuredOf } from "./music-catalog";
import { releaseTitleOf, type DemoListen } from "./music-log";

export type TopsKind = "artists" | "albums" | "tracks" | "genres" | "moods";

const TOPS_KINDS: readonly TopsKind[] = [
  "artists",
  "albums",
  "tracks",
  "genres",
  "moods",
];

export function parseTopsKind(raw: unknown): TopsKind {
  return TOPS_KINDS.find((kind) => kind === raw) ?? "artists";
}

export function byCountDesc<T extends { count: number }>(items: Iterable<T>): T[] {
  return [...items].sort((a, b) => b.count - a.count);
}

export function tallyBy<T extends { count: number }>(
  listens: DemoListen[],
  keysOf: (listen: DemoListen) => Array<{ key: string; make: () => T }>,
): T[] {
  const counts = new Map<string, T>();
  for (const listen of listens) {
    for (const { key, make } of keysOf(listen)) {
      const row = counts.get(key) ?? make();
      row.count += 1;
      counts.set(key, row);
    }
  }
  return byCountDesc(counts.values());
}

export function rankedArtists(listens: DemoListen[]) {
  return tallyBy(listens, ({ track }) =>
    [artistOf(track), ...featuredOf(track)].map((artist) => ({
      key: artist.id,
      make: () => ({
        id: artist.id,
        name: artist.name,
        imageUrl: null as string | null,
        count: 0,
      }),
    })),
  );
}

export function rankedAlbums(listens: DemoListen[]) {
  return tallyBy(listens, ({ track }) => {
    const album = albumOf(track);
    if (!album) return [];
    return [
      {
        key: album.id,
        make: () => ({
          id: album.id,
          title: album.title,
          artistName: artistOf(track).name,
          imageUrl: null as string | null,
          count: 0,
        }),
      },
    ];
  });
}

export function rankedTracks(listens: DemoListen[]) {
  return tallyBy(listens, ({ track }) => [
    {
      key: track.id,
      make: () => ({
        id: track.id,
        title: track.title,
        artistName: artistOf(track).name,
        releaseTitle: releaseTitleOf(track),
        imageUrl: null as string | null,
        count: 0,
      }),
    },
  ]);
}

export function rankedGenres(listens: DemoListen[], kind: "genre" | "mood") {
  return tallyBy(listens, ({ track }) =>
    track.genres
      .filter((genre) => genre.kind === kind)
      .map((genre) => ({
        key: genre.id,
        make: () => ({
          id: genre.id,
          name: genre.name,
          slug: genre.slug,
          count: 0,
        }),
      })),
  );
}

export function rankedByKind(listens: DemoListen[], kind: TopsKind) {
  if (kind === "artists") return rankedArtists(listens);
  if (kind === "albums") return rankedAlbums(listens);
  if (kind === "tracks") return rankedTracks(listens);
  return rankedGenres(listens, kind === "genres" ? "genre" : "mood");
}
