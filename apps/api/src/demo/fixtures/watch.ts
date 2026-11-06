import {
  DEMO_USER_ID,
  type MediaTrendingShelf,
  type WatchCatalogSearchResponse,
} from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import {
  watchBreakdown,
  watchContinue,
  watchInsights,
  watchOverview,
  watchRecent,
  watchTimeseries,
  watchTops,
} from "./watch-analytics";
import { DEMO_WATCH_TITLES } from "./watch-catalog";
import { watchRewindInsight, watchRewindStats } from "./watch-rewind";
import { str } from "./watch-read-shared";
import { watchTitleDetail } from "./watch-title";

const SEARCH_LIMIT = 20;

const TRENDING = [
  ["Severance", "tv"],
  ["Dune: Part Two", "movie"],
  ["The Bear", "tv"],
  ["Oppenheimer", "movie"],
  ["Andor", "tv"],
  ["Poor Things", "movie"],
  ["Slow Horses", "tv"],
  ["Past Lives", "movie"],
  ["Shogun", "tv"],
  ["The Holdovers", "movie"],
  ["The Last of Us", "tv"],
  ["Anatomy of a Fall", "movie"],
] as const;

function trendingTmdb() {
  return {
    items: TRENDING.map(([name, subtitle], index) => ({
      id: `demo-trending-${index + 1}`,
      name,
      imageUrl: null,
      subtitle,
      href: null,
      rank: index + 1,
    })),
    meta: {
      source: "tmdb",
      windowLabel: "Last 7 days (TMDB half-life)",
      from: null,
      to: null,
    },
  } satisfies MediaTrendingShelf;
}

function catalogSearch(query: Record<string, unknown>) {
  const q = str(query.q)?.trim().toLowerCase().slice(0, 100);
  if (!q) return { items: [] };
  return {
    items: DEMO_WATCH_TITLES.filter((title) => title.name.toLowerCase().includes(q))
      .slice(0, SEARCH_LIMIT)
      .map((title) => ({
        id: title.id,
        name: title.name,
        year: title.year,
        type: title.type,
        posterUrl: null,
        sources: [title.anime ? ("anilist" as const) : ("tmdb" as const)],
        ...(title.anime ? { originCountry: "JP" } : {}),
      })),
  } satisfies WatchCatalogSearchResponse;
}

const disconnected = () => ({
  connected: false,
  syncing: false,
  lastSyncedAt: null,
});

const ANIME_PROVIDERS = ["anilist", "mal", "kitsu", "bangumi", "shikimori"];

export const watchRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/watch/analytics/overview", respond: watchOverview },
  { method: "GET", pattern: "/watch/analytics/insights", respond: watchInsights },
  { method: "GET", pattern: "/watch/analytics/breakdown/:kind", respond: watchBreakdown },
  { method: "GET", pattern: "/watch/analytics/tops/:kind", respond: watchTops },
  { method: "GET", pattern: "/watch/analytics/timeseries", respond: watchTimeseries },
  { method: "GET", pattern: "/watch/analytics/recent", respond: watchRecent },
  { method: "GET", pattern: "/watch/analytics/continue", respond: watchContinue },
  { method: "GET", pattern: "/watch/analytics/titles/:id", respond: watchTitleDetail },
  { method: "GET", pattern: "/watch/analytics/rewind/stats", respond: watchRewindStats },
  { method: "GET", pattern: "/watch/analytics/rewind/ai", respond: watchRewindInsight },
  { method: "GET", pattern: "/watch/imports/active", respond: () => null },
  {
    method: "GET",
    pattern: "/watch/sync-status",
    respond: () => ({
      active: false,
      letterboxd: null,
      trakt: disconnected(),
      anilist: disconnected(),
    }),
  },
  { method: "GET", pattern: "/watch/trending/tmdb", respond: trendingTmdb },
  { method: "GET", pattern: "/watch/catalog/search", respond: (ctx) => catalogSearch(ctx.query) },
  {
    method: "GET",
    pattern: "/watch/trakt/status",
    respond: () => ({ connected: false, userId: DEMO_USER_ID, syncing: false }),
  },
  {
    method: "GET",
    pattern: "/watch/letterboxd/status",
    respond: () => ({
      connected: false,
      username: null,
      lastSyncedAt: null,
      syncCursor: null,
    }),
  },
  ...ANIME_PROVIDERS.map((provider) => ({
    method: "GET" as const,
    pattern: `/watch/${provider}/status`,
    respond: () => ({
      connected: false,
      userId: DEMO_USER_ID,
      syncing: false,
      lastSyncedAt: null,
    }),
  })),
];
