import type { RewindInsightResponse, RewindReadStats } from "@questorylabs/shared";
import {
  commonExtras,
  priorPeriodBounds,
  zonedPeriodBounds,
} from "../../lib/rewind-stats";
import { enrichReadRewind } from "../../read/analytics/rewind-enrich";
import type { DemoRequestContext } from "../demo.types";
import { type DemoReadEvent, readEvents } from "./read-events";
import {
  genreCounts,
  periodParam,
  rewindPeaks,
  sortedCounts,
  tally,
  tzParam,
} from "./watch-read-shared";

function within(
  events: DemoReadEvent[],
  bounds: { start: Date; end: Date },
): DemoReadEvent[] {
  return events.filter(
    (event) => event.at >= bounds.start && event.at < bounds.end,
  );
}

export function readRewindStats(ctx: DemoRequestContext): RewindReadStats {
  const period = periodParam(ctx.query.period);
  const timeZone = tzParam(ctx.query);
  const priorBounds = priorPeriodBounds(period, timeZone);
  const all = readEvents();
  const events = within(all, zonedPeriodBounds(period, timeZone));
  const priorEvents = within(all, priorBounds);
  const titles = new Map(
    [...events, ...priorEvents].map((event) => [event.title.id, event.title]),
  );
  const titleCounts = tally(events, (event) => [event.title.id]);
  const inProgress = [...titleCounts.keys()].filter(
    (id) => titles.get(id)?.listStatus === "reading",
  ).length;

  return {
    domain: "read",
    period,
    totalEvents: events.length,
    chaptersLogged: events.reduce((sum, event) => sum + event.chaptersRead, 0),
    uniqueTitles: titleCounts.size,
    topTitles: [...titleCounts.entries()]
      .map(([id, count]) => ({
        id,
        name: titles.get(id)?.name ?? id,
        subtitle: titles.get(id)?.format ?? null,
        count,
        imageUrl: null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topGenres: genreCounts(events, (event) => event.title.genres).slice(0, 5),
    formatBreakdown: sortedCounts(tally(events, (event) => [event.title.format])),
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
      prior: [...tally(priorEvents, (event) => [event.title.id]).entries()].map(
        ([id, count]) => ({ id, name: titles.get(id)?.name ?? id, count }),
      ),
      priorStart: priorBounds.start,
      earliestEventAt: all[all.length - 1]?.at ?? null,
    }),
    ...enrichReadRewind(
      events.map((event) => ({
        readTitleId: event.title.id,
        status: event.status,
        volumesRead: event.volumesRead,
      })),
    ),
    inProgress,
  };
}

export function readRewindInsight(ctx: DemoRequestContext) {
  const stats = readRewindStats(ctx);
  const [top] = stats.topTitles;
  const genres = stats.topGenres.map((genre) => genre.name).join(", ");
  const content =
    stats.totalEvents === 0
      ? `<balance>Nothing was logged in ${stats.period}. The shelf will keep your place for when you come back.</balance>`
      : [
          `<readyear>You logged **${stats.totalEvents} reading sessions** across **${stats.uniqueTitles} titles** in ${stats.period}.</readyear>`,
          `<chapterslogged>That came to **${stats.chaptersLogged} chapters** turned.</chapterslogged>`,
          top
            ? `<toptitles>**${top.name}** took the most sessions, with ${top.count} logged.</toptitles>`
            : "",
          genres ? `<topgenres>You kept coming back to ${genres}.</topgenres>` : "",
          stats.peakDow && stats.peakHour
            ? `<balance>Most reading landed on ${stats.peakDow.label} around ${stats.peakHour.label}.</balance>`
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
