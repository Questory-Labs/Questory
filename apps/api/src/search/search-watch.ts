import type { ParsedSearchQuery } from "@questorylabs/shared";
import { textForScope } from "@questorylabs/shared";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeName } from "../watch/lib/normalize";
import { containsInsensitive } from "./search-text";

function titleTextFilter(text: string): Prisma.TitleWhereInput {
  const normalized = normalizeName(text);
  return {
    OR: [
      { name: containsInsensitive(text) },
      { displayName: containsInsensitive(text) },
      { nameNormalized: { contains: normalized } },
    ],
  };
}

export async function searchWatch(
  prisma: PrismaService,
  userId: string,
  parsed: ParsedSearchQuery,
  limit: number,
  type: "movie" | "show",
) {
  const text = textForScope(parsed, type) || textForScope(parsed, "watch");
  const since =
    parsed.activityKind === "watch" || parsed.activityKind === "any"
      ? parsed.since
      : undefined;

  const userLink: Prisma.TitleWhereInput = since
    ? {
        watchEvents: {
          some: { userId, watchedAt: { gte: since } },
        },
      }
    : {
        OR: [
          { watchEvents: { some: { userId } } },
          { listStates: { some: { userId } } },
        ],
      };

  const titleWhere: Prisma.TitleWhereInput = {
    type,
    AND: [
      ...(text ? [titleTextFilter(text)] : []),
      userLink,
    ],
  };

  const titles = await prisma.title.findMany({
    where: titleWhere,
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      watchEvents: {
        where: {
          userId,
          ...(since ? { watchedAt: { gte: since } } : {}),
        },
        orderBy: { watchedAt: "desc" },
        take: 1,
        select: { watchedAt: true },
      },
    },
  });

  return titles.map((t) => ({
    id: t.id,
    name: t.displayName ?? t.name,
    year: t.year,
    posterUrl: t.posterUrl,
    lastWatchedAt: t.watchEvents[0]?.watchedAt.toISOString() ?? null,
  }));
}
