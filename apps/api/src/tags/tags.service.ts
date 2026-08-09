import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MEDIA_TYPES = [
  "steam_game",
  "music_track",
  "watch_title",
  "read_title",
] as const;

export type MediaTagType = (typeof MEDIA_TYPES)[number];

export function isMediaTagType(value: string): value is MediaTagType {
  return (MEDIA_TYPES as readonly string[]).includes(value);
}

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForMedia(mediaType: MediaTagType, mediaId: string) {
    const rows = await this.prisma.mediaTag.findMany({
      where: { mediaType, mediaId },
      include: { tag: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      mediaType,
      mediaId,
      tags: rows.map((r) => ({
        id: r.tag.id,
        name: r.tag.name,
        isUserModified: r.isUserModified,
        weight: r.weight,
      })),
    };
  }

  /** Replace the tag set for a media item; marks links as user-modified. */
  async replaceForMedia(
    mediaType: MediaTagType,
    mediaId: string,
    tagNames: string[],
  ) {
    const cleaned = tagNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ name, nameNormalized: normalizeTagName(name) }));
    const byNorm = new Map<string, { name: string; nameNormalized: string }>();
    for (const t of cleaned) {
      if (!byNorm.has(t.nameNormalized)) byNorm.set(t.nameNormalized, t);
    }
    const unique = [...byNorm.values()];

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaTag.deleteMany({ where: { mediaType, mediaId } });

      for (const t of unique) {
        const tag = await tx.tag.upsert({
          where: { nameNormalized: t.nameNormalized },
          create: {
            name: t.name,
            nameNormalized: t.nameNormalized,
          },
          update: {},
        });
        await tx.mediaTag.create({
          data: {
            tagId: tag.id,
            mediaType,
            mediaId,
            isUserModified: true,
          },
        });
      }
    });

    return this.listForMedia(mediaType, mediaId);
  }
}
