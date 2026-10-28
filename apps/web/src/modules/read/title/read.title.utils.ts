import type { ReadTitleDetail } from "@questorylabs/shared";
import { formatDate } from "@/lib/dates";

export const READ_TITLE_WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export const chaptersLeft = (d: ReadTitleDetail): number | null => {
  const total = d.title.chapters;
  if (total == null) return null;
  return Math.max(0, total - (d.progressChapters ?? 0));
};

export const nextChapter = (d: ReadTitleDetail): number | null => {
  const next = (d.progressChapters ?? 0) + 1;
  if (d.title.chapters != null && next > d.title.chapters) return null;
  return next;
};

export const paceText = (d: ReadTitleDetail, now = new Date()): string | null => {
  const left = chaptersLeft(d);
  const weeks = d.pace?.weeksToFinish;
  if (left == null || left === 0) return null;
  const head = `About ${left} ${left === 1 ? "chapter" : "chapters"} left.`;
  if (weeks == null || !d.pace || d.pace.chaptersPerWeek <= 0) return head;
  const doneBy = new Date(now.getTime() + Math.ceil(weeks * 7) * DAY_MS).toISOString();
  return `${head} At your pace, done by around ${formatDate(doneBy)}.`;
};

export const anilistMangaUrl = (anilistId: number | null | undefined): string | null =>
  anilistId ? `https://anilist.co/manga/${anilistId}` : null;

export const progressSummary = (d: ReadTitleDetail): string =>
  [
    d.progressVolumes ? `Vol. ${d.progressVolumes}` : null,
    d.score != null ? `Score ${d.score}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
