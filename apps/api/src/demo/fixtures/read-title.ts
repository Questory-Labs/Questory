import type { ReadTitleDetail, ReadTitleTimeseries } from "@questorylabs/shared";
import { READ_TITLE_PACE_WEEKS } from "../../read/analytics/analytics.constants";
import { readPace } from "../../read/analytics/read-shelf";
import type { DemoRequestContext } from "../demo.types";
import { findReadTitle } from "./read-catalog";
import { readEvents } from "./read-events";
import {
  DAY_MS,
  inRange,
  intParam,
  parseRange,
  rangeBounds,
  type RangeKey,
} from "./watch-read-shared";

const WEEK_MS = 7 * DAY_MS;
const RECENT_LIMIT = 20;

function stubDetail(id: string, range: RangeKey): ReadTitleDetail {
  return {
    range,
    title: {
      id,
      name: "Title not in demo",
      displayName: null,
      format: "other",
      year: null,
      overview: "This title isn't part of the demo library.",
      coverUrl: null,
      imageManual: false,
      publishingStatus: null,
      chapters: null,
      volumes: null,
      genres: [],
      anilistId: null,
      malId: null,
    },
    listStatus: null,
    progressChapters: null,
    progressVolumes: null,
    score: null,
    pace: null,
    eventCount: 0,
    firstReadAt: null,
    latestReadAt: null,
    recentEvents: [],
  };
}

export function readTitleDetail(ctx: DemoRequestContext): ReadTitleDetail {
  const id = ctx.params.id ?? "";
  const range = parseRange(ctx.query.range, "all");
  const title = findReadTitle(id);
  if (!title) return stubDetail(id, range);

  const own = readEvents().filter((event) => event.title.id === id);
  const { start } = rangeBounds(range);
  const paceSince = Date.now() - READ_TITLE_PACE_WEEKS * WEEK_MS;
  const paceChapters = own
    .filter((event) => event.at.getTime() >= paceSince)
    .reduce((sum, event) => sum + event.chaptersRead, 0);
  const progressChapters = own[0]?.progressChapters ?? 0;

  return {
    range,
    title: {
      id: title.id,
      name: title.name,
      displayName: null,
      format: title.format,
      year: title.year,
      overview: title.overview,
      coverUrl: null,
      imageManual: false,
      publishingStatus: title.publishingStatus,
      chapters: title.chapters,
      volumes: title.volumes,
      genres: title.genres,
      anilistId: null,
      malId: null,
    },
    listStatus: title.listStatus,
    progressChapters,
    progressVolumes: own[0]?.volumesRead ?? 0,
    score: title.score,
    pace: readPace(
      paceChapters,
      READ_TITLE_PACE_WEEKS,
      progressChapters,
      title.chapters,
    ),
    eventCount: own.filter((event) => inRange(event.at, start)).length,
    firstReadAt: own[own.length - 1]?.at.toISOString() ?? null,
    latestReadAt: own[0]?.at.toISOString() ?? null,
    recentEvents: own.slice(0, RECENT_LIMIT).map((event) => ({
      id: event.id,
      readAt: event.at.toISOString(),
      source: event.source,
      status: event.status,
      chaptersRead: event.chaptersRead,
      volumesRead: event.volumesRead,
    })),
  };
}

export function readTitleTimeseries(ctx: DemoRequestContext): ReadTitleTimeseries {
  const weeks = intParam(ctx.query.weeks, 12, 1, 52);
  const now = Date.now();
  const start = now - weeks * WEEK_MS;
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const event of readEvents()) {
    if (event.title.id !== ctx.params.id) continue;
    const index = Math.floor((event.at.getTime() - start) / WEEK_MS);
    if (index >= 0 && index < weeks) buckets[index]! += event.chaptersRead;
  }
  return {
    granularity: "week" as const,
    weeks,
    items: buckets.map((count, index) => {
      const key = new Date(start + index * WEEK_MS).toISOString().slice(0, 10);
      return { key, label: key, count };
    }),
  };
}
