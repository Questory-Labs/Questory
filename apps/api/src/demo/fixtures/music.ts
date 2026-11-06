import type { MediaTrendingShelf, MusicScrobblerStatus } from "@questorylabs/shared";
import type { DemoRequestContext, DemoRoute } from "../demo.types";
import { daysAgo } from "./helpers";
import {
  heatmapOf,
  musicBreakdown,
  musicInsights,
  musicMovers,
  musicOverview,
  musicPlayingNow,
  musicRecent,
  musicTimeseries,
  musicTops,
  parseGranularity,
} from "./music-aggregates";
import {
  musicAlbumCorrection,
  musicArtistCorrection,
  musicCatalogSuggest,
  musicTrackCorrection,
} from "./music-corrections";
import {
  musicAlbumDetail,
  musicAlbumListens,
  musicArtistDetail,
  musicEntityTimeseries,
  musicTrackDetail,
  musicTrackListens,
  trackListensInRange,
} from "./music-detail";
import {
  demoListens,
  inRange,
  limitParam,
  pageParams,
  rangeParam,
  stringParam,
  zoneParam,
} from "./music-log";
import { parseTopsKind } from "./music-rank";
import { musicRewindInsight, musicRewindStats, parseRewindPeriod } from "./music-rewind";

const MOVERS_DEFAULT_LIMIT = 5;
const MOVERS_MAX_LIMIT = 20;
const BREAKDOWN_DEFAULT_LIMIT = 20;
const SUGGEST_DEFAULT_LIMIT = 10;
const SUGGEST_MAX_LIMIT = 25;
const LIST_MAX = 100;
const TOPS_PAGE_SIZE = 20;
const RECENT_PAGE_SIZE = 40;
const DETAIL_PAGE_SIZE = 20;

const TRENDING_ARTISTS: Array<[name: string, listenCount: number]> = [
  ["Taylor Swift", 184220],
  ["Radiohead", 142870],
  ["Kendrick Lamar", 131460],
  ["The Beatles", 118930],
  ["Daft Punk", 104310],
  ["Pink Floyd", 98760],
  ["Tame Impala", 91240],
  ["Linkin Park", 87510],
  ["Fleetwood Mac", 80690],
  ["Billie Eilish", 76320],
  ["Arctic Monkeys", 72840],
  ["David Bowie", 69110],
  ["Beach House", 58430],
  ["Frank Ocean", 55970],
  ["Phoebe Bridgers", 49280],
];

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function trendingShelf(): MediaTrendingShelf {
  const from = dateOnly(daysAgo(7));
  const to = dateOnly(daysAgo(0));
  return {
    items: TRENDING_ARTISTS.map(([name, listenCount], index) => ({
      id: name,
      name,
      imageUrl: null,
      subtitle: null,
      href: null,
      listenCount,
      rank: index + 1,
    })),
    meta: {
      source: "listenbrainz",
      windowLabel: `ListenBrainz week ${from} – ${to}`,
      from,
      to,
      cached: true,
    },
  } satisfies MediaTrendingShelf;
}

function scrobblerStatus(): MusicScrobblerStatus {
  return {
    nativeScrobbling: true,
    lastfm: {
      configured: true,
      connected: true,
      username: null,
      lastSyncedAt: daysAgo(0),
      lastError: null,
    },
  } satisfies MusicScrobblerStatus;
}

function get(pattern: string, respond: (ctx: DemoRequestContext) => unknown): DemoRoute {
  return { method: "GET", pattern, respond };
}

export const musicRoutes: DemoRoute[] = [
  get("/music/analytics/overview", ({ query }) =>
    musicOverview(demoListens(), zoneParam(query)),
  ),
  get("/music/analytics/insights", ({ query }) =>
    musicInsights(demoListens(), rangeParam(query, "week"), zoneParam(query)),
  ),
  get("/music/analytics/playing-now", () => musicPlayingNow()),
  get("/music/analytics/breakdown/:kind", ({ params, query }) =>
    musicBreakdown(
      demoListens(),
      params.kind === "years" ? "years" : "services",
      rangeParam(query, "month"),
      limitParam(query, BREAKDOWN_DEFAULT_LIMIT, LIST_MAX),
    ),
  ),
  get("/music/analytics/tops/:kind", ({ params, query }) => {
    const { page, pageSize } = pageParams(query, TOPS_PAGE_SIZE);
    return musicTops(
      demoListens(),
      parseTopsKind(params.kind),
      rangeParam(query, "week"),
      page,
      pageSize,
    );
  }),
  get("/music/analytics/timeseries", ({ query }) =>
    musicTimeseries(
      demoListens(),
      parseGranularity(query.granularity),
      rangeParam(query, "month"),
      zoneParam(query),
    ),
  ),
  get("/music/analytics/heatmap", ({ query }) =>
    heatmapOf(inRange(demoListens(), rangeParam(query, "week")), zoneParam(query)),
  ),
  get("/music/analytics/recent", ({ query }) => {
    const { page, pageSize } = pageParams(query, RECENT_PAGE_SIZE);
    return musicRecent(
      demoListens(),
      { q: stringParam(query, "q"), source: stringParam(query, "source") },
      page,
      pageSize,
    );
  }),
  get("/music/analytics/movers", ({ query }) =>
    musicMovers(
      demoListens(),
      parseTopsKind(query.kind),
      rangeParam(query, "week"),
      limitParam(query, MOVERS_DEFAULT_LIMIT, MOVERS_MAX_LIMIT),
    ),
  ),
  get("/music/analytics/tracks/:id", ({ params, query }) =>
    musicTrackDetail(demoListens(), params.id, rangeParam(query, "all"), zoneParam(query)),
  ),
  get("/music/analytics/tracks/:id/listens", ({ params, query }) => {
    const { page, pageSize } = pageParams(query, DETAIL_PAGE_SIZE);
    return musicTrackListens(
      demoListens(),
      params.id,
      rangeParam(query, "all"),
      page,
      pageSize,
    );
  }),
  get("/music/analytics/tracks/:id/timeseries", ({ params, query }) =>
    musicEntityTimeseries(
      demoListens(),
      "track",
      params.id,
      query.granularity,
      rangeParam(query, "all"),
      zoneParam(query),
    ),
  ),
  get("/music/analytics/tracks/:id/heatmap", ({ params, query }) =>
    heatmapOf(
      trackListensInRange(demoListens(), params.id, rangeParam(query, "all")),
      zoneParam(query),
    ),
  ),
  get("/music/analytics/artists/:id", ({ params, query }) =>
    musicArtistDetail(demoListens(), params.id, rangeParam(query, "all"), zoneParam(query)),
  ),
  get("/music/analytics/artists/:id/timeseries", ({ params, query }) =>
    musicEntityTimeseries(
      demoListens(),
      "artist",
      params.id,
      query.granularity,
      rangeParam(query, "all"),
      zoneParam(query),
    ),
  ),
  get("/music/analytics/albums/:id", ({ params, query }) =>
    musicAlbumDetail(demoListens(), params.id, rangeParam(query, "all"), zoneParam(query)),
  ),
  get("/music/analytics/albums/:id/listens", ({ params, query }) => {
    const { page, pageSize } = pageParams(query, DETAIL_PAGE_SIZE);
    return musicAlbumListens(
      demoListens(),
      params.id,
      rangeParam(query, "all"),
      page,
      pageSize,
    );
  }),
  get("/music/analytics/albums/:id/timeseries", ({ params, query }) =>
    musicEntityTimeseries(
      demoListens(),
      "album",
      params.id,
      query.granularity,
      rangeParam(query, "all"),
      zoneParam(query),
    ),
  ),
  get("/music/analytics/rewind/stats", ({ query }) => {
    const timeZone = zoneParam(query);
    return musicRewindStats(parseRewindPeriod(query.period, timeZone), timeZone);
  }),
  get("/music/analytics/rewind/ai", ({ query }) => {
    const timeZone = zoneParam(query);
    return musicRewindInsight(parseRewindPeriod(query.period, timeZone), timeZone);
  }),
  get("/music/catalog/suggest", ({ query }) =>
    musicCatalogSuggest(
      query.kind,
      stringParam(query, "q"),
      limitParam(query, SUGGEST_DEFAULT_LIMIT, SUGGEST_MAX_LIMIT),
    ),
  ),
  get("/music/corrections/tracks/:id", ({ params }) =>
    musicTrackCorrection(demoListens(), params.id),
  ),
  get("/music/corrections/albums/:id", ({ params }) => musicAlbumCorrection(params.id)),
  get("/music/corrections/artists/:id", ({ params }) => musicArtistCorrection(params.id)),
  get("/music/imports/active", () => null),
  get("/music/scrobbler/lastfm/status", () => scrobblerStatus()),
  get("/music/trending/sitewide", () => trendingShelf()),
];
