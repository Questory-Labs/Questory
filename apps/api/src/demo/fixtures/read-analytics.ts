import {
  DEMO_USER_ID,
  type ReadBreakdownResponse,
  type ReadInsights,
  type ReadOverview,
  type ReadRecentPage,
  type ReadTimeBucket,
  type ReadTopItem,
} from "@questorylabs/shared";
import { percentDelta } from "../../lib/percent-delta";
import { computeStreakDays } from "../../lib/timezone";
import { demoUser } from "../demo-user";
import type { DemoRequestContext } from "../demo.types";
import { DEMO_READ_TITLES } from "./read-catalog";
import {
  type DemoReadEvent,
  filterByFormat,
  parseFormat,
  progressByTitle,
  readEvents,
} from "./read-events";
import {
  genreCounts,
  inRange,
  insightPeaks,
  intParam,
  pageParams,
  parseGranularity,
  parseRange,
  rangeBounds,
  share,
  sortedCounts,
  tally,
  timeBuckets,
  tzParam,
} from "./watch-read-shared";

function sumChapters(events: DemoReadEvent[]): number {
  return events.reduce((sum, event) => sum + event.chaptersRead, 0);
}

export function readOverview(ctx: DemoRequestContext) {
  const events = readEvents();
  const dates = events.map((event) => event.at);
  const progress = [...progressByTitle(events).values()];
  const tracked = DEMO_READ_TITLES.length;
  const completed = DEMO_READ_TITLES.filter((t) => t.listStatus === "completed").length;
  return {
    userId: DEMO_USER_ID,
    personaName: demoUser(ctx.exp).personaName,
    totalEvents: events.length,
    uniqueTitles: progress.length,
    chaptersLogged: progress.reduce((sum, entry) => sum + entry.chapters, 0),
    volumesLogged: progress.reduce((sum, entry) => sum + entry.volumes, 0),
    completionRate: share(completed, tracked),
    inProgress: DEMO_READ_TITLES.filter((t) => t.listStatus === "reading").length,
    latestReadAt: dates[0]?.toISOString() ?? null,
    earliestReadAt: dates[dates.length - 1]?.toISOString() ?? null,
    streakDays: computeStreakDays(dates, tzParam(ctx.query)),
  } satisfies ReadOverview;
}

export function readInsights(ctx: DemoRequestContext) {
  const range = parseRange(ctx.query.range, "week");
  const format = parseFormat(ctx.query.format);
  const timeZone = tzParam(ctx.query);
  const all = filterByFormat(readEvents(), format);
  const { start, previousStart } = rangeBounds(range);
  const events = all.filter((event) => inRange(event.at, start));
  const previous =
    start == null || previousStart == null
      ? []
      : all.filter((event) => {
          const at = event.at.getTime();
          return at >= previousStart && at < start;
        });
  const titleCounts = tally(events, (event) => [event.title.id]);
  const earlier = new Set(
    start == null
      ? []
      : all
          .filter((event) => event.at.getTime() < start)
          .map((event) => event.title.id),
  );
  const chapters = sumChapters(events);
  const previousChapters = sumChapters(previous);
  const breakdown = (keyOf: (event: DemoReadEvent) => string) =>
    sortedCounts(tally(events, (event) => [keyOf(event)]));

  return {
    range,
    format: format ?? "all",
    periodEvents: events.length,
    ...insightPeaks(
      events.map((event) => event.at),
      timeZone,
    ),
    topGenre: genreCounts(events, (event) => event.title.genres)[0] ?? null,
    chaptersLogged: chapters,
    newTitles:
      start == null
        ? 0
        : [...titleCounts.keys()].filter((id) => !earlier.has(id)).length,
    topTitleShare: share(Math.max(0, ...titleCounts.values()), events.length),
    uniqueTitles: titleCounts.size,
    formatBreakdown: breakdown((event) => event.title.format),
    statusBreakdown: breakdown((event) => event.status),
    sourceBreakdown: breakdown((event) => event.source),
    compare:
      range === "all"
        ? {
            previousEvents: null,
            deltaPct: null,
            previousChapters: null,
            chaptersDeltaPct: null,
          }
        : {
            previousEvents: previous.length,
            deltaPct: percentDelta(events.length, previous.length),
            previousChapters,
            chaptersDeltaPct: percentDelta(chapters, previousChapters),
          },
  } satisfies ReadInsights;
}

function rangedEvents(query: Record<string, unknown>, fallback: "week" | "month") {
  const { start } = rangeBounds(parseRange(query.range, fallback));
  return readEvents().filter((event) => inRange(event.at, start));
}

export function readBreakdown(ctx: DemoRequestContext) {
  const events = filterByFormat(rangedEvents(ctx.query, "month"), ctx.query.format);
  const limit = intParam(ctx.query.limit, 20, 1, 100);
  const kind = ctx.params.kind;
  const labelled = (keyOf: (event: DemoReadEvent) => string) =>
    sortedCounts(tally(events, (event) => [keyOf(event)])).map(({ name, count }) => ({
      key: name,
      label: name,
      count,
    }));
  const items =
    kind === "sources"
      ? labelled((event) => event.source)
      : kind === "formats"
        ? labelled((event) => event.title.format)
        : kind === "statuses"
          ? labelled((event) => event.status)
          : [...tally(events, (event) => [String(event.title.year)]).entries()]
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([key, count]) => ({ key, label: key, count }));
  return {
    periodEvents: events.length,
    items: items.slice(0, limit),
  } satisfies ReadBreakdownResponse;
}

export function readTops(ctx: DemoRequestContext) {
  const limit = intParam(ctx.query.limit, 20, 1, 100);
  const events = rangedEvents(ctx.query, "week");
  if (ctx.params.kind === "genres") {
    return genreCounts(events, (event) => event.title.genres).slice(
      0,
      limit,
    ) satisfies ReadTopItem[];
  }
  if (ctx.params.kind === "formats") {
    return sortedCounts(tally(events, (event) => [event.title.format]))
      .map(({ name, count }) => ({ id: name, name, count }))
      .slice(0, limit) satisfies ReadTopItem[];
  }
  const titles = new Map(events.map((event) => [event.title.id, event.title]));
  return [...tally(events, (event) => [event.title.id]).entries()]
    .map(([id, count]) => ({
      id,
      name: titles.get(id)?.name ?? id,
      format: titles.get(id)?.format ?? "other",
      coverUrl: null,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit) satisfies ReadTopItem[];
}

export function readTimeseries(ctx: DemoRequestContext) {
  const events = filterByFormat(rangedEvents(ctx.query, "month"), ctx.query.format);
  return timeBuckets(
    events.map((event) => event.at),
    parseGranularity(ctx.query.granularity),
    tzParam(ctx.query),
  ) satisfies ReadTimeBucket[];
}

export function readRecent(ctx: DemoRequestContext) {
  const { page, pageSize } = pageParams(ctx.query);
  const events = readEvents();
  return {
    total: events.length,
    page,
    pageSize,
    items: events.slice((page - 1) * pageSize, page * pageSize).map((event) => ({
      id: event.id,
      readAt: event.at.toISOString(),
      source: event.source,
      status: event.status,
      chaptersRead: event.chaptersRead,
      volumesRead: event.volumesRead,
      progress: event.percent ?? 0,
      precision: event.precision,
      title: {
        id: event.title.id,
        name: event.title.name,
        format: event.title.format,
        coverUrl: null,
        genres: event.title.genres,
      },
      titleChapters: event.title.chapters,
    })),
  } satisfies ReadRecentPage;
}
