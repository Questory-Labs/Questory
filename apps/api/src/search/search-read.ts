import type { ParsedSearchQuery } from "@questorylabs/shared";
import { textForScope } from "@questorylabs/shared";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeName } from "../watch/lib/normalize";
import { containsInsensitive } from "./search-text";

function readTitleTextFilter(text: string): Prisma.ReadTitleWhereInput {
  const normalized = normalizeName(text);
  return {
    OR: [
      { name: containsInsensitive(text) },
      { displayName: containsInsensitive(text) },
      { nameNormalized: { contains: normalized } },
    ],
  };
}

export async function searchRead(
  prisma: PrismaService,
  userId: string,
  parsed: ParsedSearchQuery,
  limit: number,
) {
  const text = textForScope(parsed, "read");
  const since =
    parsed.activityKind === "read" || parsed.activityKind === "any"
      ? parsed.since
      : undefined;
  const status = parsed.filters.status;

  const where: Prisma.ReadListStateWhereInput = {
    userId,
    ...(status ? { listStatus: status } : {}),
    ...(since
      ? {
          OR: [
            { listedAt: { gte: since } },
            { updatedAt: { gte: since } },
            {
              readTitle: {
                readEvents: {
                  some: { userId, readAt: { gte: since } },
                },
              },
            },
          ],
        }
      : {}),
    ...(text
      ? {
          readTitle: readTitleTextFilter(text),
        }
      : {}),
  };

  const rows = await prisma.readListState.findMany({
    where,
    take: limit,
    orderBy: [{ listedAt: "desc" }, { updatedAt: "desc" }],
    include: { readTitle: true },
  });

  return rows.map((r) => ({
    id: r.readTitle.id,
    name: r.readTitle.displayName ?? r.readTitle.name,
    format: r.readTitle.format,
    coverUrl: r.readTitle.coverUrl,
    listStatus: r.listStatus,
  }));
}
