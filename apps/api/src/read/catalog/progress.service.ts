import { Injectable, NotFoundException } from "@nestjs/common";
import type { ReadProgressBody } from "@questorylabs/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../../watch/users/users.service";
import { ReadCatalogService } from "./catalog.service";

const MANUAL_SOURCE = "manual";
const LIST_STATE_SCAN_LIMIT = 20;

export function manualProgressPercent(
  chapter: number,
  totalChapters: number | null,
): number {
  if (totalChapters != null && totalChapters > 0) {
    return Math.min(100, Math.round((chapter / totalChapters) * 100));
  }
  return chapter > 0 ? 50 : 0;
}

@Injectable()
export class ReadProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly catalog: ReadCatalogService,
  ) {}

  async log(userId: string, titleId: string, body: ReadProgressBody) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("Read user not found");
    const title = await this.prisma.readTitle.findUnique({
      where: { id: titleId },
      select: { id: true, chapters: true },
    });
    if (!title) throw new NotFoundException("Title not found");

    const states = await this.prisma.readListState.findMany({
      where: { userId: user.id, readTitleId: title.id },
      take: LIST_STATE_SCAN_LIMIT,
      select: { progressChapters: true },
    });
    const current = states.reduce(
      (max, s) => Math.max(max, s.progressChapters ?? 0),
      0,
    );
    const dedupeKey = `manual:${title.id}:ch${body.chapter}:v${body.volume ?? ""}`;
    const existing = await this.prisma.readEvent.findUnique({
      where: { userId_dedupeKey: { userId: user.id, dedupeKey } },
      select: { id: true },
    });
    const chaptersRead = existing ? 0 : Math.max(0, body.chapter - current);
    const listStatus =
      title.chapters != null && title.chapters > 0 && body.chapter >= title.chapters
        ? "completed"
        : "reading";
    const readAt = new Date();

    const event =
      existing ??
      (await this.catalog.recordProgress({
        userId: user.id,
        readTitleId: title.id,
        readAt,
        source: MANUAL_SOURCE,
        dedupeKey,
        action: "progress",
        status: listStatus,
        chaptersRead,
        volumesRead: body.volume ?? null,
        progress: manualProgressPercent(body.chapter, title.chapters),
        precision: "exact",
        chaptersDelta: chaptersRead,
      }));

    await this.catalog.upsertListState({
      userId: user.id,
      readTitleId: title.id,
      listStatus,
      source: MANUAL_SOURCE,
      progressChapters: body.chapter,
      progressVolumes: body.volume,
      listedAt: readAt,
    });

    return {
      id: event.id,
      readTitleId: title.id,
      chapter: body.chapter,
      volume: body.volume ?? null,
      chaptersRead,
      listStatus,
    };
  }
}
