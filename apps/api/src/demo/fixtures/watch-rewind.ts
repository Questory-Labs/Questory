import type { RewindInsightResponse, RewindWatchStats } from "@questorylabs/shared";
import {
  commonExtras,
  priorPeriodBounds,
  zonedPeriodBounds,
} from "../../lib/rewind-stats";
import { enrichWatchRewind } from "../../watch/analytics/rewind-enrich";
import type { DemoRequestContext } from "../demo.types";
import { type DemoWatchEvent, watchEvents } from "./watch-events";
import {
  genreCounts,
  periodParam,
  rewindPeaks,
  tally,
  tzParam,
} from "./watch-read-shared";

function within(
  events: DemoWatchEvent[],
  bounds: { start: Date; end: Date },
): DemoWatchEvent[] {
  return events.filter(
    (event) => event.at >= bounds.start && event.at < bounds.end,
  );
}

function completedSeasons(
  events: DemoWatchEvent[],
  bounds: { start: Date; end: Date },
): number {
  let completed = 0;
  for (const event of within(events, bounds)) {
    if (event.title.type !== "show" || !event.episode) continue;
    if (event.title.seasons[event.episode.seasonNumber - 1] === event.episode.episodeNumber) {
      completed += 1;
    }
  }
  return completed;
}

export function watchRewindStats(ctx: DemoRequestContext): RewindWatchStats {
  const period = periodParam(ctx.query.period);
  const timeZone = tzParam(ctx.query);
  const bounds = zonedPeriodBounds(period, timeZone);
  const priorBounds = priorPeriodBounds(period, timeZone);
  const all = watchEvents();
  const events = within(all, bounds);
  const movies = events.filter((event) => event.title.type === "movie");
  const shows = events.filter((event) => event.title.type === "show");
  const titleCounts = tally(events, (event) => [event.title.id]);
  const titleById = new Map(events.map((event) => [event.title.id, event.title]));
  const priorEvents = within(all, priorBounds);
  const priorTitles = new Map(priorEvents.map((event) => [event.title.id, event.title]));
  const priorCounts = tally(priorEvents, (event) => [event.title.id]);
  const earliest = all[all.length - 1]?.at ?? null;
  const dropped = new Set(
    events.filter((event) => event.title.type === "show" && event.title.dropped)
      .map((event) => event.title.id),
  );

  return {
    domain: "watch",
    period,
    totalWatches: events.length,
    watchingMinutes: events.reduce((sum, event) => sum + event.minutes, 0),
    uniqueTitles: titleCounts.size,
    uniqueMovies: new Set(movies.map((event) => event.title.id)).size,
    uniqueShows: new Set(shows.map((event) => event.title.id)).size,
    movieWatches: movies.length,
    showWatches: shows.length,
    topTitles: [...titleCounts.entries()]
      .map(([id, count]) => ({
        id,
        name: titleById.get(id)?.name ?? id,
        subtitle: titleById.get(id)?.type ?? null,
        count,
        imageUrl: null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topGenres: genreCounts(events, (event) => event.title.genres).slice(0, 5),
    ...rewindPeaks(
      events.map((event) => event.at),
      timeZone,
    ),
    ...commonExtras({
      period,
      timeZone,
      events: events.map((event) => ({
        at: event.at,
        itemId: event.title.id,
        name: event.title.name,
      })),
      prior: [...priorCounts.entries()].map(([id, count]) => ({
        id,
        name: priorTitles.get(id)?.name ?? id,
        count,
      })),
      priorStart: priorBounds.start,
      earliestEventAt: earliest,
    }),
    ...enrichWatchRewind(
      events.map((event) => ({
        titleId: event.title.id,
        name: event.title.name,
        type: event.title.type,
        imageUrl: null,
        watchedAt: event.at,
        episodeId: event.episode?.id ?? null,
        progress: event.progress,
        rating: event.rating,
      })),
      timeZone,
    ),
    completedSeasons: completedSeasons(all, bounds),
    droppedTitles: dropped.size,
  };
}

function formatHours(minutes: number): string {
  return Math.round(minutes / 60).toLocaleString("en-US");
}

export function watchRewindInsight(ctx: DemoRequestContext) {
  const stats = watchRewindStats(ctx);
  const [top] = stats.topTitles;
  const genres = stats.topGenres.map((genre) => genre.name).join(", ");
  const content =
    stats.totalWatches === 0
      ? `<balance>Nothing was logged in ${stats.period}. A quiet stretch happens to everyone, and the watchlist will still be there.</balance>`
      : [
          `<watchyear>You logged **${stats.totalWatches} watches** across **${stats.uniqueTitles} titles** in ${stats.period}, split between ${stats.movieWatches} movies and ${stats.showWatches} episodes.</watchyear>`,
          `<hourswatched>That adds up to about **${formatHours(stats.watchingMinutes)} hours** of screen time.</hourswatched>`,
          top
            ? `<toptitles>**${top.name}** led the period with ${top.count} ${top.count === 1 ? "watch" : "watches"}.</toptitles>`
            : "",
          genres ? `<topgenres>Your go-to genres were ${genres}.</topgenres>` : "",
          stats.peakDow && stats.peakHour
            ? `<balance>Most sessions landed on ${stats.peakDow.label} around ${stats.peakHour.label}.</balance>`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");
  return {
    period: stats.period,
    content,
    generatedAt: new Date().toISOString(),
    cached: ctx.query.forceRedo !== "true",
  } satisfies RewindInsightResponse;
}
