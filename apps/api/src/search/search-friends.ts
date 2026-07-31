import type { ParsedSearchQuery } from "@questorylabs/shared";
import { textForScope } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { containsInsensitive } from "./search-text";

export async function searchFriends(
  prisma: PrismaService,
  userId: string,
  parsed: ParsedSearchQuery,
  limit: number,
) {
  const text = textForScope(parsed, "friend");
  const friends = await prisma.friendship.findMany({
    where: {
      userId,
      ...(text ? { personaName: containsInsensitive(text) } : {}),
    },
    take: limit,
    orderBy: { personaName: "asc" },
  });

  return friends.map((f) => ({
    steamId: f.friendSteamId,
    personaName: f.personaName,
    avatarUrl: f.avatarUrl,
    friendUserId: f.friendUserId,
  }));
}

export async function searchCollections(
  prisma: PrismaService,
  userId: string,
  parsed: ParsedSearchQuery,
  limit: number,
) {
  const text = textForScope(parsed, "collection");
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      ...(text ? { name: containsInsensitive(text) } : {}),
    },
    include: { _count: { select: { items: true } } },
    take: limit,
    orderBy: { name: "asc" },
  });

  return collections.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "auto" | "custom",
    ruleKey: c.ruleKey,
    gameCount: c._count.items,
    description: c.description,
  }));
}
