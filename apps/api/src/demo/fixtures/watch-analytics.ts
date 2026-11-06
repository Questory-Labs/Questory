import {
  DEMO_USER_ID,
  type WatchBreakdownResponse,
  type WatchContinueResponse,
  type WatchInsights,
  type WatchOverview,
  type WatchRecentPage,
  type WatchTimeBucket,
  type WatchTopItem,
} from "@questorylabs/shared";
import { percentDelta } from "../../lib/percent-delta";
import { computeStreakDays } from "../../lib/timezone";
import { progressPercent, sortTopTitles } from "../../watch/analytics/watch-shelf";
import { demoUser } from "../demo-user";
import type { DemoRequestContext } from "../demo.types";
import { DEMO_SHOWS } from "./watch-catalog-shows";
import {
  type DemoWatchEvent,
  episodeAt,
  episodeName,
  eventsForTitle,
  filterByType,
  totalEpisodes,
  watchEvents,
} from "./watch-events";
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
  str,
  tally,
  timeBuckets,
  tzParam,
  DAY_MS,
} from "./watch-read-shared";

const CONTINUE_WINDOW_DAYS = 120;

function sumMinutes(events: DemoWatchEvent[]): number {
  return events.reduce((sum, event) => sum + event.minutes, 0);
}

function uniqueTitleCount(events: DemoWatchEvent[]): number {
  return new Set(events.map((event) => event.title.id)).size;
}

function byType(events: DemoWatchEvent[], type: "movie" | "show") {
  return events.filter((event) => event.title.type === type);
}

export function watchOverview(ctx: DemoRequestContext) {
  const events = watchEvents();
  const dates = events.map((event) => event.at);
  return {
    userId: DEMO_USER_ID,
    personaName: demoUser(ctx.exp).personaName,
    totalWatches: events.length,
    uniqueTitles: uniqueTitleCount(events),
    totalMinutes: sumMinutes(events),
    latestWatchAt: dates[0]?.toISOString() ?? null,
    earliestWatchAt: dates[dates.length - 1]?.toISOString() ?? null,
    streakDays: computeStreakDays(dates, tzParam(ctx.query)),
  } satisfies WatchOverview;
}

export function watchInsights(ctx: DemoRequestContext) {
  const range = parseRange(ctx.query.range, "week");
  const type = str(ctx.query.type);
  const filter = type === "movie" || type === "show" ? type : undefined;
  const timeZone = tzParam(ctx.query);
  const all = filterByType(watchEvents(), filter);
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
  const topCount = Math.max(0, ...titleCounts.values());
  const earlier = new Set(
    start == null
      ? []
      : all
          .filter((event) => event.at.getTime() < start)
          .map((event) => event.title.id),
  );
  const movies = byType(events, "movie");
  const shows = byType(events, "show");
  const minutes = sumMinutes(events);
  const previousMinutes = sumMinutes(previous);

  return {
    range,
    type: filter ?? "all",
    periodWatches: events.length,
    ...insightPeaks(
      events.map((event) => event.at),
      timeZone,
    ),
    topGenre: genreCounts(events, (event) => event.title.genres)[0] ?? null,
    watchingMinutes: minutes,
    watchesWithRuntime: events.length,
    runtimeCoverage: share(events.length, events.length),
    newTitles: [...titleCounts.keys()].filter((id) => !earlier.has(id)).length,
    topTitleShare: share(topCount, events.length),
    uniqueTitles: titleCounts.size,
    movieWatches: movies.length,
    showWatches: shows.length,
    movieMinutes: sumMinutes(movies),
    showMinutes: sumMinutes(shows),
    uniqueMovies: uniqueTitleCount(movies),
    uniqueShows: uniqueTitleCount(shows),
    sourceBreakdown: sortedCounts(tally(events, (event) => [event.source])).slice(0, 5),
    compare:
      range === "all"
        ? {
            previousWatches: null,
            deltaPct: null,
            previousWatchingMinutes: null,
            watchingMinutesDeltaPct: null,
          }
        : {
            previousWatches: previous.length,
            deltaPct: percentDelta(events.length, previous.length),
            previousWatchingMinutes: previousMinutes,
            watchingMinutesDeltaPct: percentDelta(minutes, previousMinutes),
          },
  } satisfies WatchInsights;
}

function rangedEvents(query: Record<string, unknown>, fallback: "week" | "month") {
  const { start } = rangeBounds(parseRange(query.range, fallback));
  return watchEvents().filter((event) => inRange(event.at, start));
}

export function watchBreakdown(ctx: DemoRequestContext) {
  const events = filterByType(rangedEvents(ctx.query, "month"), ctx.query.type);
  const limit = intParam(ctx.query.limit, 20, 1, 100);
  const items =
    ctx.params.kind === "sources"
      ? sortedCounts(tally(events, (event) => [event.source])).map(
          ({ name, count }) => ({ key: name, label: name, count }),
        )
      : [...tally(events, (event) => [String(event.title.year)]).entries()]
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([key, count]) => ({ key, label: key, count }));
  return {
    periodWatches: events.length,
    items: items.slice(0, limit),
  } satisfies WatchBreakdownResponse;
}

export function watchTops(ctx: DemoRequestContext) {
  const kind = ctx.params.kind;
  const limit = intParam(ctx.query.limit, 20, 1, 100);
  const events = rangedEvents(ctx.query, "week");
  if (kind === "genres") {
    return genreCounts(
      filterByType(events, ctx.query.type),
      (event) => event.title.genres,
    ).slice(0, limit) satisfies WatchTopItem[];
  }
  const type =
    kind === "movies" ? "movie" : kind === "shows" ? "show" : ctx.query.type;
  const totals = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      posterUrl: null;
      count: number;
      minutes: number;
    }
  >();
  for (const event of filterByType(events, type)) {
    const entry = totals.get(event.title.id) ?? {
      id: event.title.id,
      name: event.title.name,
      type: event.title.type,
      posterUrl: null,
      count: 0,
      minutes: 0,
    };
    entry.count += 1;
    entry.minutes += event.minutes;
    totals.set(event.title.id, entry);
  }
  const sort = ctx.query.sort === "minutes" ? "minutes" : "count";
  return sortTopTitles([...totals.values()], sort).slice(0, limit) satisfies WatchTopItem[];
}

export function watchTimeseries(ctx: DemoRequestContext) {
  const events = filterByType(rangedEvents(ctx.query, "month"), ctx.query.type);
  return timeBuckets(
    events.map((event) => event.at),
    parseGranularity(ctx.query.granularity),
    tzParam(ctx.query),
  ) satisfies WatchTimeBucket[];
}

export function watchRecent(ctx: DemoRequestContext) {
  const { page, pageSize } = pageParams(ctx.query);
  const search = str(ctx.query.q)?.trim().toLowerCase();
  const events = filterByType(watchEvents(), ctx.query.type).filter(
    (event) => !search || event.title.name.toLowerCase().includes(search),
  );
  return {
    total: events.length,
    page,
    pageSize,
    items: events.slice((page - 1) * pageSize, page * pageSize).map((event) => ({
      id: event.id,
      watchedAt: event.at.toISOString(),
      source: event.source,
      precision: event.precision,
      rating: event.rating,
      progress: event.progress,
      title: {
        id: event.title.id,
        name: event.title.name,
        type: event.title.type,
        posterUrl: null,
        genres: event.title.genres,
      },
      episode: event.episode
        ? {
            id: event.episode.id,
            seasonNumber: event.episode.seasonNumber,
            episodeNumber: event.episode.episodeNumber,
            name: event.episode.name,
          }
        : null,
    })),
  } satisfies WatchRecentPage;
}

export function watchContinue(ctx: DemoRequestContext) {
  const limit = intParam(ctx.query.limit, 8, 1, 20);
  const events = watchEvents();
  const since = Date.now() - CONTINUE_WINDOW_DAYS * DAY_MS;
  const items = DEMO_SHOWS.flatMap((show) => {
    const own = eventsForTitle(events, show.id);
    const latest = own[0];
    if (!latest?.episode || latest.at.getTime() < since || show.dropped) return [];
    const next = episodeAt(show, own.length);
    if (!next) return [];
    const total = totalEpisodes(show);
    return [
      {
        title: {
          id: show.id,
          name: show.name,
          posterUrl: null,
          backdropUrl: null,
          totalEpisodes: total,
        },
        anime: show.anime,
        lastWatchedAt: latest.at.toISOString(),
        last: {
          seasonNumber: latest.episode.seasonNumber,
          episodeNumber: latest.episode.episodeNumber,
        },
        next: {
          ...next,
          name: episodeName(show.id, next.seasonNumber, next.episodeNumber),
        },
        watchedEpisodes: own.length,
        progress: progressPercent(own.length, total),
      },
    ];
  });
  return {
    items: items
      .sort((a, b) => b.lastWatchedAt.localeCompare(a.lastWatchedAt))
      .slice(0, limit),
  } satisfies WatchContinueResponse;
}
