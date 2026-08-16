import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeName } from "../lib/tokens";
import { CATALOG_SUGGEST_MAX } from "./corrections.constants";

export type CatalogSuggestKind = "artist" | "album" | "track";

export type CatalogSuggestItem = {
  id?: string;
  name: string;
  isNew?: boolean;
};

function userListens(userId: string): Prisma.ListenListRelationFilter {
  return { some: { userId } };
}

function withCreateOption(
  q: string,
  qNorm: string,
  items: CatalogSuggestItem[],
): CatalogSuggestItem[] {
  if (q && !items.some((i) => normalizeName(i.name) === qNorm)) {
    return [{ name: q, isNew: true }, ...items];
  }
  return items;
}

export async function suggestCatalog(
  prisma: PrismaService,
  userId: string,
  kind: CatalogSuggestKind,
  query: string,
  limit = 10,
): Promise<{ items: CatalogSuggestItem[] }> {
  const q = query.trim();
  const take = Math.min(Math.max(limit, 1), CATALOG_SUGGEST_MAX);
  const qNorm = q ? normalizeName(q) : "";
  const listens = userListens(userId);

  if (kind === "artist") {
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
      take,
    });
    return {
      items: withCreateOption(
        q,
        qNorm,
        artists.map((a) => ({ id: a.id, name: a.name })),
      ),
    };
  }

  if (kind === "album") {
    const releases = await prisma.release.findMany({
      where: {
        ...(qNorm ? { titleNormalized: { contains: qNorm } } : {}),
        tracks: { some: { listens } },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take,
    });
    return {
      items: withCreateOption(
        q,
        qNorm,
        releases.map((r) => ({ id: r.id, name: r.title })),
      ),
    };
  }

  const tracks = await prisma.track.findMany({
    where: {
      ...(qNorm ? { titleNormalized: { contains: qNorm } } : {}),
      listens,
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
    take,
  });
  return {
    items: withCreateOption(
      q,
      qNorm,
      tracks.map((t) => ({ id: t.id, name: t.title })),
    ),
  };
}
