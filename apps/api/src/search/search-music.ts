import type { ParsedSearchQuery } from "@questorylabs/shared";
import { textForScope } from "@questorylabs/shared";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeName } from "../music/lib/tokens";

type MusicKind = "artist" | "album" | "track";

type ListenWhere = {
  userId: string;
  listenedAt?: { gte: Date };
};

function musicKindsToSearch(parsed: ParsedSearchQuery): Set<MusicKind> {
  if (parsed.scopes.length === 0) {
    return new Set(["artist", "album", "track"]);
  }
  if (parsed.scopes.includes("music")) {
    return new Set(["artist", "album", "track"]);
  }
  const kinds = new Set<MusicKind>();
  if (parsed.scopes.includes("artist")) kinds.add("artist");
  if (parsed.scopes.includes("album")) kinds.add("album");
  if (parsed.scopes.includes("track")) kinds.add("track");
  return kinds;
}

function scopedMusicText(parsed: ParsedSearchQuery, kind: MusicKind): string {
  return textForScope(parsed, kind) || textForScope(parsed, "music");
}

function listenSomeFilter(listenWhere: ListenWhere): Prisma.ListenListRelationFilter {
  return {
    some: {
      userId: listenWhere.userId,
      ...(listenWhere.listenedAt ? { listenedAt: listenWhere.listenedAt } : {}),
    },
  };
}

export async function searchMusic(
  prisma: PrismaService,
  userId: string,
  parsed: ParsedSearchQuery,
  limit: number,
) {
  const kinds = musicKindsToSearch(parsed);
  const since =
    parsed.activityKind === "listen" || parsed.activityKind === "any"
      ? parsed.since
      : undefined;

  const listenWhere: ListenWhere = {
    userId,
    ...(since ? { listenedAt: { gte: since } } : {}),
  };

  const [artistRows, albumRows, trackRows] = await Promise.all([
    kinds.has("artist")
      ? searchArtists(prisma, listenWhere, scopedMusicText(parsed, "artist"), limit)
      : Promise.resolve([]),
    kinds.has("album")
      ? searchAlbums(prisma, listenWhere, scopedMusicText(parsed, "album"), limit)
      : Promise.resolve([]),
    kinds.has("track")
      ? searchTracks(prisma, listenWhere, scopedMusicText(parsed, "track"), limit)
      : Promise.resolve([]),
  ]);

  return {
    artists: artistRows,
    albums: albumRows,
    tracks: trackRows,
  };
}

async function searchArtists(
  prisma: PrismaService,
  listenWhere: ListenWhere,
  text: string,
  limit: number,
) {
  const qNorm = text ? normalizeName(text) : "";
  const listens = listenSomeFilter(listenWhere);

  const artists = await prisma.artist.findMany({
    where: {
      ...(qNorm ? { nameNormalized: { contains: qNorm } } : {}),
      OR: [
        { tracks: { some: { listens } } },
        { trackFeatures: { some: { track: { listens } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return artists;
}

async function searchAlbums(
  prisma: PrismaService,
  listenWhere: ListenWhere,
  text: string,
  limit: number,
) {
  const qNorm = text ? normalizeName(text) : "";
  const listens = listenSomeFilter(listenWhere);

  const releases = await prisma.release.findMany({
    where: {
      ...(qNorm ? { titleNormalized: { contains: qNorm } } : {}),
      tracks: { some: { listens } },
    },
    select: {
      id: true,
      title: true,
      artist: { select: { name: true } },
    },
    orderBy: { title: "asc" },
    take: limit,
  });

  return releases.map((r) => ({
    id: r.id,
    name: r.title,
    artistName: r.artist?.name ?? null,
  }));
}

async function searchTracks(
  prisma: PrismaService,
  listenWhere: ListenWhere,
  text: string,
  limit: number,
) {
  const qNorm = text ? normalizeName(text) : "";
  const listens = listenSomeFilter(listenWhere);

  const tracks = await prisma.track.findMany({
    where: {
      ...(qNorm ? { titleNormalized: { contains: qNorm } } : {}),
      listens,
    },
    select: {
      id: true,
      title: true,
      artist: { select: { name: true } },
      release: { select: { title: true } },
    },
    orderBy: { title: "asc" },
    take: limit,
  });

  return tracks.map((t) => ({
    id: t.id,
    name: t.title,
    artistName: t.artist.name,
    albumName: t.release?.title ?? null,
  }));
}
