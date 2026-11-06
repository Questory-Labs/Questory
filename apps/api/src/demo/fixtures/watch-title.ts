import type { WatchTitleDetail } from "@questorylabs/shared";
import type { DemoRequestContext } from "../demo.types";
import { findWatchTitle } from "./watch-catalog";
import type { DemoShow } from "./watch-catalog-shows";
import {
  type DemoWatchEvent,
  episodeName,
  eventsForTitle,
  totalEpisodes,
  watchEvents,
} from "./watch-events";
import { inRange, parseRange, rangeBounds, type RangeKey } from "./watch-read-shared";

const RECENT_LIMIT = 20;
const TOP_EPISODE_LIMIT = 10;

function seasonRows(show: DemoShow, events: DemoWatchEvent[]) {
  const watched = new Map(
    events.flatMap((event) =>
      event.episode
        ? [
            [
              `${event.episode.seasonNumber}:${event.episode.episodeNumber}`,
              event,
            ] as const,
          ]
        : [],
    ),
  );
  return show.seasons.map((size, s) => {
    const seasonNumber = s + 1;
    const episodes = Array.from({ length: size }, (_, e) => {
      const episodeNumber = e + 1;
      const event = watched.get(`${seasonNumber}:${episodeNumber}`);
      return {
        seasonNumber,
        episodeNumber,
        name: episodeName(show.id, seasonNumber, episodeNumber),
        airDate: null,
        runtimeMinutes: show.runtime,
        watchCount: event ? 1 : 0,
        lastWatchedAt: event?.at.toISOString() ?? null,
      };
    });
    return {
      seasonNumber,
      name: `Season ${seasonNumber}`,
      episodeCount: size,
      watchedEpisodes: episodes.filter((episode) => episode.watchCount > 0).length,
      episodes,
    };
  });
}

function stubDetail(id: string, range: RangeKey): WatchTitleDetail {
  return {
    range,
    title: {
      id,
      name: "Title not in demo",
      displayName: null,
      type: "movie",
      year: null,
      overview: "This title isn't part of the demo library.",
      posterUrl: null,
      imageManual: false,
      genres: [],
      backdropUrl: null,
      tmdbId: null,
      imdbId: null,
      anilistId: null,
      malId: null,
      status: null,
      lastAirDate: null,
      totalEpisodes: null,
    },
    eventCount: 0,
    firstWatchAt: null,
    latestWatchAt: null,
    userRating: null,
    totalMinutesWatched: 0,
    distinctEpisodesWatched: 0,
    seasons: [],
    topEpisodes: [],
    recentEvents: [],
  };
}

export function watchTitleDetail(ctx: DemoRequestContext): WatchTitleDetail {
  const id = ctx.params.id ?? "";
  const range = parseRange(ctx.query.range, "all");
  const title = findWatchTitle(id);
  if (!title) return stubDetail(id, range);

  const own = eventsForTitle(watchEvents(), id);
  const { start } = rangeBounds(range);
  const ranged = own.filter((event) => inRange(event.at, start));
  const rated = own.find((event) => event.rating != null);
  const withEpisode = own.flatMap((event) =>
    event.episode ? [{ event, episode: event.episode }] : [],
  );

  return {
    range,
    title: {
      id: title.id,
      name: title.name,
      displayName: null,
      type: title.type,
      year: title.year,
      overview: title.overview,
      posterUrl: null,
      imageManual: false,
      genres: title.genres,
      backdropUrl: null,
      tmdbId: null,
      imdbId: null,
      anilistId: null,
      malId: null,
      status: title.status,
      lastAirDate: null,
      totalEpisodes: title.type === "show" ? totalEpisodes(title) : null,
    },
    eventCount: ranged.length,
    firstWatchAt: own[own.length - 1]?.at.toISOString() ?? null,
    latestWatchAt: own[0]?.at.toISOString() ?? null,
    userRating: rated?.rating ?? null,
    totalMinutesWatched: own.reduce((sum, event) => sum + event.minutes, 0),
    distinctEpisodesWatched: withEpisode.length,
    seasons: title.type === "show" ? seasonRows(title, own) : [],
    topEpisodes: withEpisode
      .slice(0, TOP_EPISODE_LIMIT)
      .map(({ episode }) => ({
        id: episode.id,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        name: episode.name,
        count: 1,
      })),
    recentEvents: own.slice(0, RECENT_LIMIT).map((event) => ({
      id: event.id,
      watchedAt: event.at.toISOString(),
      source: event.source,
      rating: event.rating,
      episode: event.episode
        ? {
            seasonNumber: event.episode.seasonNumber,
            episodeNumber: event.episode.episodeNumber,
            name: event.episode.name,
          }
        : null,
    })),
  };
}
