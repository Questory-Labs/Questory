import { DEMO_USER_ID, type MediaTrendingShelf } from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import {
  readBreakdown,
  readInsights,
  readOverview,
  readRecent,
  readTimeseries,
  readTops,
} from "./read-analytics";
import { readLibrary } from "./read-library";
import { readRewindInsight, readRewindStats } from "./read-rewind";
import { readTitleDetail, readTitleTimeseries } from "./read-title";

const TRENDING = [
  ["One Piece", "MANGA"],
  ["Solo Leveling", "MANGA"],
  ["Chainsaw Man", "MANGA"],
  ["Frieren: Beyond Journey's End", "MANGA"],
  ["The Apothecary Diaries", "NOVEL"],
  ["Omniscient Reader's Viewpoint", "MANGA"],
  ["Berserk", "MANGA"],
  ["Mushoku Tensei", "NOVEL"],
  ["Witch Hat Atelier", "MANGA"],
  ["Look Back", "ONE_SHOT"],
  ["Vinland Saga", "MANGA"],
  ["Spice and Wolf", "NOVEL"],
] as const;

function trendingAnilist() {
  return {
    items: TRENDING.map(([name, subtitle], index) => ({
      id: `demo-read-trending-${index + 1}`,
      name,
      imageUrl: null,
      subtitle,
      href: null,
      rank: index + 1,
    })),
    meta: {
      source: "anilist",
      windowLabel: "Trending now",
      from: null,
      to: null,
    },
  } satisfies MediaTrendingShelf;
}

const disconnected = () => ({
  connected: false,
  syncing: false,
  lastSyncedAt: null,
});

const PROVIDERS = ["anilist", "mal", "kitsu", "bangumi", "shikimori"];

export const readRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/read/analytics/overview", respond: readOverview },
  { method: "GET", pattern: "/read/analytics/insights", respond: readInsights },
  { method: "GET", pattern: "/read/analytics/breakdown/:kind", respond: readBreakdown },
  { method: "GET", pattern: "/read/analytics/tops/:kind", respond: readTops },
  { method: "GET", pattern: "/read/analytics/timeseries", respond: readTimeseries },
  { method: "GET", pattern: "/read/analytics/recent", respond: readRecent },
  { method: "GET", pattern: "/read/analytics/titles/:id", respond: readTitleDetail },
  { method: "GET", pattern: "/read/analytics/titles/:id/timeseries", respond: readTitleTimeseries },
  { method: "GET", pattern: "/read/analytics/rewind/stats", respond: readRewindStats },
  { method: "GET", pattern: "/read/analytics/rewind/ai", respond: readRewindInsight },
  { method: "GET", pattern: "/read/library", respond: readLibrary },
  {
    method: "GET",
    pattern: "/read/sync-status",
    respond: () => ({
      active: false,
      anilist: disconnected(),
      mal: disconnected(),
      kitsu: disconnected(),
      bangumi: disconnected(),
      shikimori: disconnected(),
    }),
  },
  { method: "GET", pattern: "/read/trending/anilist", respond: trendingAnilist },
  ...PROVIDERS.map((provider) => ({
    method: "GET" as const,
    pattern: `/read/${provider}/status`,
    respond: () => ({
      connected: false,
      userId: DEMO_USER_ID,
      syncing: false,
      lastSyncedAt: null,
    }),
  })),
];
