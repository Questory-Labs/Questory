import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { hourStartUtc, normalizeName, slugify } from "../lib/normalize";

export type UpsertReadTitleInput = {
  format: string;
  name: string;
  year?: number | null;
  overview?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  coverUrl?: string | null;
  anilistId?: number | null;
  malId?: number | null;
  kitsuId?: number | null;
  bangumiId?: number | null;
  shikimoriId?: number | null;
  countryOfOrigin?: string | null;
  publishingStatus?: string | null;
};

export type RecordReadProgressInput = {
  userId: string;
  readTitleId: string;
  readAt: Date;
  source: string;
  dedupeKey: string;
  action?: string;
  status?: string | null;
  chaptersRead?: number | null;
  volumesRead?: number | null;
  progress?: number;
  rating?: number | null;
  precision?: string;
  rawPayload?: string | null;
  chaptersDelta?: number;
};

@Injectable()
export class ReadCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private coverForUpdate(
    existing: { coverUrl: string | null; imageManual: boolean },
    incoming?: string | null,
  ) {
    if (existing.imageManual) return existing.coverUrl;
    return incoming ?? existing.coverUrl;
  }

  private normalizeOptionalText(value: string | null | undefined) {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async updateTitle(
    id: string,
    input: { displayName?: string | null; coverUrl?: string | null },
  ) {
    const title = await this.prisma.readTitle.findUnique({ where: { id } });
    if (!title) throw new NotFoundException("Title not found");

    const data: {
      displayName?: string | null;
      coverUrl?: string | null;
      imageManual?: boolean;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = this.normalizeOptionalText(input.displayName);
    }
    if (input.coverUrl !== undefined) {
      const url = this.normalizeOptionalText(input.coverUrl);
      data.coverUrl = url;
      data.imageManual = url != null;
    }

    return this.prisma.readTitle.update({ where: { id }, data });
  }

  async upsertTitle(input: UpsertReadTitleInput) {
    const nameNormalized = normalizeName(input.name);
    const idMerge = {
      anilistId: input.anilistId ?? null,
      malId: input.malId ?? null,
      kitsuId: input.kitsuId ?? null,
      bangumiId: input.bangumiId ?? null,
      shikimoriId: input.shikimoriId ?? null,
    };

    const mergeUpdate = (
      existing: {
        format: string;
        year: number | null;
        overview: string | null;
        chapters: number | null;
        volumes: number | null;
        coverUrl: string | null;
        imageManual: boolean;
        anilistId: number | null;
        malId: number | null;
        kitsuId: number | null;
        bangumiId: number | null;
        shikimoriId: number | null;
        countryOfOrigin: string | null;
        publishingStatus: string | null;
      },
    ) => ({
      name: input.name,
      nameNormalized,
      format: input.format,
      year: input.year ?? existing.year,
      overview: input.overview ?? existing.overview,
      chapters: input.chapters ?? existing.chapters,
      volumes: input.volumes ?? existing.volumes,
      coverUrl: this.coverForUpdate(existing, input.coverUrl),
      anilistId: idMerge.anilistId ?? existing.anilistId,
      malId: idMerge.malId ?? existing.malId,
      kitsuId: idMerge.kitsuId ?? existing.kitsuId,
      bangumiId: idMerge.bangumiId ?? existing.bangumiId,
      shikimoriId: idMerge.shikimoriId ?? existing.shikimoriId,
      countryOfOrigin: input.countryOfOrigin ?? existing.countryOfOrigin,
      publishingStatus: input.publishingStatus ?? existing.publishingStatus,
      metadataSyncedAt: new Date(),
    });

    if (input.anilistId != null) {
      const byAni = await this.prisma.readTitle.findUnique({
        where: { anilistId: input.anilistId },
      });
      if (byAni) {
        return this.prisma.readTitle.update({
          where: { id: byAni.id },
          data: mergeUpdate(byAni),
        });
      }
    }

    const idLookups: Array<{
      field: keyof Pick<
        UpsertReadTitleInput,
        "malId" | "kitsuId" | "bangumiId" | "shikimoriId"
      >;
      where: Record<string, unknown>;
    }> = [
      { field: "malId", where: { malId: input.malId ?? undefined } },
      { field: "kitsuId", where: { kitsuId: input.kitsuId ?? undefined } },
      { field: "bangumiId", where: { bangumiId: input.bangumiId ?? undefined } },
      {
        field: "shikimoriId",
        where: { shikimoriId: input.shikimoriId ?? undefined },
      },
    ];

    for (const lookup of idLookups) {
      if (input[lookup.field] == null) continue;
      const found = await this.prisma.readTitle.findFirst({
        where: lookup.where,
      });
      if (found) {
        return this.prisma.readTitle.update({
          where: { id: found.id },
          data: mergeUpdate(found),
        });
      }
    }

    const existing = await this.prisma.readTitle.findFirst({
      where: {
        format: input.format,
        nameNormalized,
        year: input.year ?? undefined,
      },
    });
    if (existing) {
      return this.prisma.readTitle.update({
        where: { id: existing.id },
        data: mergeUpdate(existing),
      });
    }

    return this.prisma.readTitle.create({
      data: {
        format: input.format,
        name: input.name,
        nameNormalized,
        year: input.year ?? null,
        overview: input.overview ?? null,
        chapters: input.chapters ?? null,
        volumes: input.volumes ?? null,
        coverUrl: input.coverUrl ?? null,
        anilistId: idMerge.anilistId,
        malId: idMerge.malId,
        kitsuId: idMerge.kitsuId,
        bangumiId: idMerge.bangumiId,
        shikimoriId: idMerge.shikimoriId,
        countryOfOrigin: input.countryOfOrigin ?? null,
        publishingStatus: input.publishingStatus ?? null,
        metadataSyncedAt: new Date(),
      },
    });
  }

  async linkGenres(readTitleId: string, genres: string[], source = "anilist") {
    for (const raw of genres) {
      const name = raw.trim();
      if (!name) continue;
      const slug = slugify(name);
      const genre = await this.prisma.genre.upsert({
        where: { slug },
        create: { name, slug },
        update: { name },
      });
      await this.prisma.readTitleGenre.upsert({
        where: {
          readTitleId_genreId_source: {
            readTitleId,
            genreId: genre.id,
            source,
          },
        },
        create: { readTitleId, genreId: genre.id, source },
        update: {},
      });
    }
  }

  async recordProgress(input: RecordReadProgressInput) {
    const event = await this.prisma.readEvent.upsert({
      where: {
        userId_dedupeKey: {
          userId: input.userId,
          dedupeKey: input.dedupeKey,
        },
      },
      create: {
        userId: input.userId,
        readTitleId: input.readTitleId,
        readAt: input.readAt,
        source: input.source,
        dedupeKey: input.dedupeKey,
        action: input.action ?? "import",
        status: input.status ?? null,
        chaptersRead: input.chaptersRead ?? null,
        volumesRead: input.volumesRead ?? null,
        progress: input.progress ?? 0,
        rating: input.rating ?? null,
        precision: input.precision ?? "day",
        rawPayload: input.rawPayload ?? null,
      },
      update: {
        progress: input.progress ?? 0,
        status: input.status ?? undefined,
        chaptersRead: input.chaptersRead ?? undefined,
        volumesRead: input.volumesRead ?? undefined,
        rating: input.rating ?? undefined,
      },
    });

    await this.bumpHourBucket(
      input.userId,
      input.readAt,
      input.chaptersDelta ?? 0,
    );
    return event;
  }

  async bumpHourBucket(userId: string, readAt: Date, chaptersDelta: number) {
    const hourStart = hourStartUtc(readAt);
    await this.prisma.readHourBucket.upsert({
      where: { userId_hourStart: { userId, hourStart } },
      create: {
        userId,
        hourStart,
        eventCount: 1,
        chaptersDelta: Math.max(0, chaptersDelta),
      },
      update: {
        eventCount: { increment: 1 },
        chaptersDelta: { increment: Math.max(0, chaptersDelta) },
      },
    });
  }

  async upsertListState(input: {
    userId: string;
    readTitleId: string;
    listStatus: string;
    source: string;
    score?: number | null;
    progressChapters?: number;
    progressVolumes?: number;
    listedAt?: Date | null;
  }) {
    return this.prisma.readListState.upsert({
      where: {
        userId_readTitleId_source: {
          userId: input.userId,
          readTitleId: input.readTitleId,
          source: input.source,
        },
      },
      create: {
        userId: input.userId,
        readTitleId: input.readTitleId,
        listStatus: input.listStatus,
        source: input.source,
        score: input.score ?? null,
        progressChapters: input.progressChapters ?? 0,
        progressVolumes: input.progressVolumes ?? 0,
        listedAt: input.listedAt ?? null,
      },
      update: {
        listStatus: input.listStatus,
        score: input.score ?? undefined,
        progressChapters: input.progressChapters ?? undefined,
        progressVolumes: input.progressVolumes ?? undefined,
        listedAt: input.listedAt ?? undefined,
      },
    });
  }
}
