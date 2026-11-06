import { describe, expect, it } from "vitest";
import {
  AppStatusSchema,
  CollectionSchema,
  ConnectionsOverviewSchema,
  CostRoiPageSchema,
  CostSummarySchema,
  DashboardStatsSchema,
  DealAlertSchema,
  FEATURE_SOURCES,
  GameDetailSchema,
  GoalListResponseSchema,
  LibraryEntrySchema,
  LibraryListResponseSchema,
  MeResponseSchema,
  NavCountsSchema,
  NotificationSchema,
  PlayNextItemSchema,
  PlaySessionGameSuggestPageSchema,
  PlaySessionPageSchema,
  PlaySessionSimilarSchema,
  PlaySessionStatsSchema,
  QmonitorDeviceListSchema,
  RewindInsightResponseSchema,
  SearchResultSchema,
  SourcesOverviewSchema,
  StoreAccountStatusSchema,
  SyncJobSchema,
  WishlistItemSchema,
} from "@questorylabs/shared";
import { z } from "zod";
import { findDemoRoute } from "../../src/demo/demo.routes";
import type { DemoRoute } from "../../src/demo/demo.types";
import { gamesRoutes } from "../../src/demo/fixtures/games";
import { DEMO_FRIENDS, DEMO_GAMES } from "../../src/demo/fixtures/helpers";
import { shellRoutes } from "../../src/demo/fixtures/shell";

const EXP = Date.now() + 60_000;
const routes: DemoRoute[] = [...shellRoutes, ...gamesRoutes];

function call(
  path: string,
  query: Record<string, unknown> = {},
  source: readonly DemoRoute[] = routes,
): unknown {
  const match = findDemoRoute("GET", path, source);
  if (!match) throw new Error(`No demo route for ${path}`);
  return match.route.respond({ exp: EXP, params: match.params, query, body: undefined });
}

const LIST = (item: z.ZodTypeAny) =>
  z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    items: z.array(item),
  });

const SCHEMAS: [string, z.ZodTypeAny][] = [
  ["/auth/me", MeResponseSchema],
  ["/users/me", MeResponseSchema],
  ["/status", AppStatusSchema],
  ["/connections", ConnectionsOverviewSchema],
  ["/sources", SourcesOverviewSchema],
  ["/stores", z.array(StoreAccountStatusSchema)],
  ["/notifications", z.array(NotificationSchema)],
  ["/qmonitor/devices", QmonitorDeviceListSchema],
  ["/shell/nav-counts", NavCountsSchema],
  ["/sync/jobs", z.object({ jobs: z.array(SyncJobSchema) })],
  ["/search", SearchResultSchema],
  ["/library", LibraryListResponseSchema],
  ["/library/demo-game-620", LibraryEntrySchema],
  ["/library/620", LibraryEntrySchema],
  ["/collections", z.array(CollectionSchema)],
  ["/wishlist", LIST(WishlistItemSchema)],
  ["/wishlist/recommendations", z.array(WishlistItemSchema)],
  ["/wishlist/deals", z.array(DealAlertSchema)],
  ["/cost/summary", CostSummarySchema],
  ["/cost/roi", CostRoiPageSchema],
  ["/dashboard/stats", DashboardStatsSchema],
  ["/dashboard/play-next", z.array(PlayNextItemSchema)],
  ["/goals", GoalListResponseSchema],
  ["/play-sessions", PlaySessionPageSchema],
  ["/play-sessions/stats", PlaySessionStatsSchema],
  ["/play-sessions/game-suggest", PlaySessionGameSuggestPageSchema],
  ["/play-sessions/demo-session-1/similar", PlaySessionSimilarSchema],
  ["/games/620", GameDetailSchema],
  ["/rewind/ai", RewindInsightResponseSchema],
  ["/games/analytics/rewind/ai", RewindInsightResponseSchema],
];

const REQUIRED_PATHS = [
  "/auth/session-check",
  "/auth/signup-status",
  "/enterprise/status",
  "/users/price-regions",
  "/users/me/import/active",
  "/api-keys",
  "/api-keys/identity",
  "/notifications/unread-count",
  "/recap/settings",
  "/shell/sync-status",
  "/sync/catalog",
  "/collections/demo-collection-weekend",
  "/rewind/stats",
  "/games/analytics/rewind/stats",
  "/tags",
];

const FORBIDDEN_PATHS = [
  "/users/me/export/file",
  "/auth/steam",
  "/auth/lastfm/authorize",
  "/admin/users",
  "/admin/settings",
];

describe("shell and games demo fixtures", () => {
  it("only declares GET routes", () => {
    expect(routes.filter((route) => route.method !== "GET")).toEqual([]);
  });

  it("does not expose denied paths", () => {
    for (const path of FORBIDDEN_PATHS) {
      expect(findDemoRoute("GET", path, routes), path).toBeNull();
    }
    for (const route of routes) {
      expect(route.pattern.startsWith("/admin")).toBe(false);
      expect(route.pattern.includes("/export/")).toBe(false);
      expect(route.pattern.includes("authorize")).toBe(false);
    }
  });

  it.each(SCHEMAS)("%s matches its shared schema", (path, schema) => {
    const parsed = schema.safeParse(call(path));
    expect(parsed.success ? null : parsed.error.issues).toBeNull();
  });

  it.each(REQUIRED_PATHS)("%s responds", (path) => {
    expect(call(path, { mediaType: "game", mediaId: "620" })).toBeDefined();
  });

  it("never throws on unusual input", () => {
    const hostile = {
      page: "-1",
      pageSize: "NaN",
      limit: ["a"],
      days: "9999",
      tz: "Not/AZone",
      period: "../../etc",
      q: { nested: true },
      status: 5,
      sort: null,
      value: [],
    };
    for (const route of routes) {
      const path = route.pattern.replace(/:\w+/g, "unknown-id");
      expect(() => call(path, hostile), path).not.toThrow();
    }
  });

  it("marks every source and domain enabled", () => {
    const status = AppStatusSchema.parse(call("/status"));
    expect(status.demo.enabled).toBe(true);
    expect(status.music.enabled && status.watch.enabled && status.read.enabled).toBe(true);
    for (const source of FEATURE_SOURCES) expect(status.sources[source]).toBe(true);
  });

  it("returns the demo user from /auth/me", () => {
    const me = MeResponseSchema.parse(call("/auth/me"));
    expect(me.user?.email).toBe("demo@questorylabs.com");
    expect(me.user?.isDemo).toBe(true);
  });

  it("honours pagination", () => {
    const first = LibraryListResponseSchema.parse(call("/library", { page: "1", pageSize: "5" }));
    const second = LibraryListResponseSchema.parse(call("/library", { page: "2", pageSize: "5" }));
    expect(first.items).toHaveLength(5);
    expect(first.total).toBeGreaterThan(5);
    expect(second.page).toBe(2);
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });

  it("keeps library and wishlist disjoint and covers the catalog", () => {
    const library = LibraryListResponseSchema.parse(call("/library", { pageSize: "100" }));
    const wishlist = LIST(WishlistItemSchema).parse(call("/wishlist", { pageSize: "100" }));
    const owned = library.items.map((entry) => entry.game.appId);
    const wished = wishlist.items.map((item) => item.appId);
    expect(owned.filter((appId) => wished.includes(appId))).toEqual([]);
    expect(owned.length + wished.length).toBe(DEMO_GAMES.length);
    expect(GameDetailSchema.parse(call("/games/632470")).youOwn).toBe(false);
  });

  it("uses only allowed public data", () => {
    const names = new Set<string>(DEMO_GAMES.map((game) => game.name));
    const library = LibraryListResponseSchema.parse(call("/library", { pageSize: "100" }));
    for (const entry of library.items) expect(names.has(entry.game.name)).toBe(true);
    const friendIds = new Set<string>(DEMO_FRIENDS.map((friend) => friend.steamId));
    for (const owner of GameDetailSchema.parse(call("/games/620")).friendOwners) {
      expect(friendIds.has(owner.steamId)).toBe(true);
      expect(owner.avatarUrl).toBeNull();
    }
  });

  it("returns usable dashboard time-played buckets", () => {
    const stats = DashboardStatsSchema.parse(call("/dashboard/stats", { tz: "Asia/Kolkata" }));
    expect(stats.timePlayed?.weekHourlySecs).toHaveLength(168);
    expect(stats.recentlyPlayed.length).toBeGreaterThan(0);
  });

  it("returns a play session window matching the requested days", () => {
    const stats = PlaySessionStatsSchema.parse(call("/play-sessions/stats", { days: "14" }));
    expect(stats.windowDays).toBe(14);
    expect(stats.byDay).toHaveLength(14);
    expect(stats.byHour).toHaveLength(24);
    expect(stats.unmatchedCount).toBeGreaterThan(0);
  });

  it("tags rewind insights in the format the web parser reads", () => {
    for (const path of ["/rewind/ai", "/games/analytics/rewind/ai"]) {
      const { content } = call(path, { period: "2025-03" }) as { content: string };
      for (const chunk of content.split("\n\n")) {
        expect(chunk).toMatch(/^<([a-z]+)>[\s\S]*<\/\1>$/i);
      }
    }
  });

  it("returns rewind buckets for the requested period", () => {
    const monthly = call("/games/analytics/rewind/stats", { period: "2025-03" }) as {
      period: string;
      domain: string;
      monthly: unknown[];
    };
    expect(monthly.domain).toBe("games");
    expect(monthly.period).toBe("2025-03");
    expect(monthly.monthly).toHaveLength(31);
    const yearly = call("/games/analytics/rewind/stats", { period: "2025" }) as {
      monthly: unknown[];
    };
    expect(yearly.monthly).toHaveLength(12);
    const all = call("/rewind/stats", { period: "2025-03" }) as {
      domain: string;
      domains: { games?: unknown };
    };
    expect(all.domain).toBe("all");
    expect(all.domains.games).toBeDefined();
  });
});
