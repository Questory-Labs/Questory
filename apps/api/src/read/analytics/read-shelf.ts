import type { PrismaService } from "../../prisma/prisma.service";
import {
  READ_TITLE_LIST_STATE_LIMIT,
  READ_TITLE_PACE_WEEKS,
  READ_TITLE_TIMESERIES_EVENT_LIMIT,
} from "./analytics.constants";

export { percentDelta } from "../../lib/percent-delta";

const WEEK_MS = 7 * 86_400_000;

export function maxListProgress(
  states: {
    progressChapters: number;
    progressVolumes: number;
    score: number | null;
    updatedAt?: Date;
  }[],
) {
  if (states.length === 0) {
    return { progressChapters: null, progressVolumes: null, score: null };
  }
  let progressChapters = 0;
  let progressVolumes = 0;
  let score: number | null = null;
  let scoreAt = 0;
  for (const s of states) {
    progressChapters = Math.max(progressChapters, s.progressChapters ?? 0);
    progressVolumes = Math.max(progressVolumes, s.progressVolumes ?? 0);
    if (s.score != null && s.score > 0) {
      const at = s.updatedAt?.getTime() ?? 0;
      if (score == null || at >= scoreAt) {
        score = s.score;
        scoreAt = at;
      }
    }
  }
  return { progressChapters, progressVolumes, score };
}

export function readPace(
  chaptersInWindow: number,
  windowWeeks: number,
  progressChapters: number | null,
  totalChapters: number | null,
) {
  if (chaptersInWindow <= 0 || windowWeeks <= 0) return null;
  const chaptersPerWeek = Math.round((chaptersInWindow / windowWeeks) * 10) / 10;
  if (chaptersPerWeek <= 0) return null;
  const remaining =
    totalChapters != null && totalChapters > 0
      ? Math.max(0, totalChapters - (progressChapters ?? 0))
      : null;
  return {
    chaptersPerWeek,
    weeksToFinish:
      remaining == null ? null : Math.ceil(remaining / chaptersPerWeek),
  };
}

export async function readTitleExtras(
  prisma: PrismaService,
  userId: string,
  title: { id: string; chapters: number | null },
  now = Date.now(),
) {
  const [states, recent] = await Promise.all([
    prisma.readListState.findMany({
      where: { userId, readTitleId: title.id },
      take: READ_TITLE_LIST_STATE_LIMIT,
      select: {
        progressChapters: true,
        progressVolumes: true,
        score: true,
        updatedAt: true,
      },
    }),
    prisma.readEvent.aggregate({
      where: {
        userId,
        readTitleId: title.id,
        readAt: { gte: new Date(now - READ_TITLE_PACE_WEEKS * WEEK_MS) },
      },
      _sum: { chaptersRead: true },
    }),
  ]);
  const progress = maxListProgress(states ?? []);
  return {
    ...progress,
    pace: readPace(
      recent?._sum?.chaptersRead ?? 0,
      READ_TITLE_PACE_WEEKS,
      progress.progressChapters,
      title.chapters,
    ),
  };
}

export async function readTitleWeeklySeries(
  prisma: PrismaService,
  userId: string,
  titleId: string,
  weeks: number,
  now = Date.now(),
) {
  const start = now - weeks * WEEK_MS;
  const events = await prisma.readEvent.findMany({
    where: { userId, readTitleId: titleId, readAt: { gte: new Date(start) } },
    orderBy: { readAt: "desc" },
    take: READ_TITLE_TIMESERIES_EVENT_LIMIT,
    select: { readAt: true, chaptersRead: true },
  });
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const e of events) {
    const idx = Math.floor((e.readAt.getTime() - start) / WEEK_MS);
    if (idx < 0 || idx >= weeks) continue;
    buckets[idx] += Math.max(0, e.chaptersRead ?? 0);
  }
  return {
    granularity: "week" as const,
    weeks,
    items: buckets.map((count, i) => {
      const key = new Date(start + i * WEEK_MS).toISOString().slice(0, 10);
      return { key, label: key, count };
    }),
  };
}
