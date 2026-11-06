import type { ReadLibraryPage } from "@questorylabs/shared";
import { daysAgo } from "./helpers";
import type { DemoRequestContext } from "../demo.types";
import { DEMO_READ_TITLES } from "./read-catalog";
import { progressByTitle, readEvents } from "./read-events";
import { intParam, pageParams, sortedCounts, str, tally } from "./watch-read-shared";

export function readLibrary(ctx: DemoRequestContext): ReadLibraryPage {
  const { query } = ctx;
  const { page, pageSize } = pageParams(query);
  const status = str(query.status);
  const format = str(query.format);
  const category = str(query.category);
  const search = str(query.q)?.trim().toLowerCase();
  const genre = str(query.genre)?.trim().toLowerCase();
  const minScore = query.minScore == null ? null : intParam(query.minScore, 0, 0, 100);
  const sort = str(query.sort);

  const events = readEvents();
  const progress = progressByTitle(events);
  const lastActivity = new Map<string, number>();
  for (const event of events) {
    if (!lastActivity.has(event.title.id)) {
      lastActivity.set(event.title.id, event.at.getTime());
    }
  }

  const base = DEMO_READ_TITLES.filter(
    (title) =>
      (minScore == null || (title.score ?? -1) >= minScore) &&
      (!format || title.format === format) &&
      (!category || title.category === category) &&
      (!search || title.name.toLowerCase().includes(search)) &&
      (!genre || title.genres.some((name) => name.toLowerCase() === genre)),
  );
  const matching = base.filter((title) => !status || title.listStatus === status);
  const sorted = [...matching].sort((a, b) => {
    if (sort === "title") return a.name.localeCompare(b.name);
    if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
    if (sort === "updated") {
      return (lastActivity.get(b.id) ?? 0) - (lastActivity.get(a.id) ?? 0);
    }
    return a.listedDaysAgo - b.listedDaysAgo;
  });

  return {
    total: matching.length,
    page,
    pageSize,
    statusCounts: sortedCounts(tally(base, (title) => [title.listStatus])).map(
      ({ name, count }) => ({ status: name, count }),
    ),
    genreOptions: [...new Set(DEMO_READ_TITLES.flatMap((title) => title.genres))].sort(),
    items: sorted.slice((page - 1) * pageSize, page * pageSize).map((title) => ({
      id: `${title.id}-list`,
      listStatus: title.listStatus,
      score: title.score,
      progressChapters: progress.get(title.id)?.chapters ?? 0,
      progressVolumes: progress.get(title.id)?.volumes ?? 0,
      listedAt: daysAgo(title.listedDaysAgo),
      title: {
        id: title.id,
        name: title.name,
        format: title.format,
        category: title.category,
        coverUrl: null,
        chapters: title.chapters,
        volumes: title.volumes,
        year: title.year,
        genres: title.genres,
      },
    })),
  };
}
