import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MediaTrendingShelfSchema,
  RewindInsightResponseSchema,
  WatchBreakdownResponseSchema,
  WatchCatalogSearchResponseSchema,
  WatchContinueResponseSchema,
  WatchInsightsSchema,
  WatchOverviewSchema,
  WatchRecentPageSchema,
  WatchTimeBucketSchema,
  WatchTitleDetailSchema,
  WatchTopItemSchema,
} from "@questorylabs/shared";
import { allRoutes, watch, read, lastMonths } from "./watch-read.helpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("demo watch and read routes", () => {
  it("exposes only GET routes and no provider handshake routes", () => {
    for (const route of allRoutes) {
      expect(route.method).toBe("GET");
      expect(route.pattern).not.toMatch(/authorize|callback|connect|webhook|cron/);
    }
    expect(new Set(allRoutes.map((r) => r.pattern)).size).toBe(allRoutes.length);
  });

  it("never throws on garbage query values or params", () => {
    const garbage: Record<string, unknown> = {
      range: ["week"],
      type: { a: 1 },
      format: 7,
      tz: "Not/AZone",
      period: "2024-13",
      limit: "-5",
      page: "abc",
      pageSize: ["1"],
      granularity: "fortnight",
      q: { $ne: null },
      sort: [],
      status: 1,
      genre: {},
      minScore: "x",
      weeks: "9999999",
    };
    const params = { kind: "bogus", id: "does-not-exist" };
    for (const route of allRoutes) {
      expect(() =>
        route.respond({ exp: 0, params, query: garbage, body: undefined }),
      ).not.toThrow();
      expect(() =>
        route.respond({ exp: 0, params: {}, query: {}, body: undefined }),
      ).not.toThrow();
    }
  });

  it("carries no URLs or provider usernames", () => {
    const samples = allRoutes.map((route) =>
      JSON.stringify(
        route.respond({
          exp: 0,
          params: { kind: "titles", id: "demo-title-severance" },
          query: { q: "the", period: lastMonths(1)[0] },
          body: undefined,
        }),
      ),
    );
    for (const sample of samples) {
      expect(sample).not.toMatch(/https?:\/\//);
    }
  });

  it("resolves real paths through the route table", async () => {
    const { findDemoRoute } = await import("../../src/demo/demo.routes");
    expect(findDemoRoute("GET", "/watch/analytics/titles/demo-title-dark")).toBeTruthy();
    expect(findDemoRoute("GET", "/read/analytics/titles/x/timeseries")).toBeTruthy();
    expect(findDemoRoute("GET", "/read/library")).toBeTruthy();
  });
});

describe("demo watch fixtures", () => {
  it("matches the overview and insights schemas with populated data", () => {
    const overview = WatchOverviewSchema.parse(watch("/analytics/overview"));
    expect(overview.totalWatches).toBeGreaterThan(300);
    expect(overview.streakDays).toBeGreaterThanOrEqual(7);

    for (const range of ["day", "week", "month", "year", "all"]) {
      const insights = WatchInsightsSchema.parse(
        watch("/analytics/insights", { range, tz: "UTC" }),
      );
      if (range !== "day") expect(insights.periodWatches).toBeGreaterThan(0);
    }
    const month = watch("/analytics/insights", { range: "month" });
    expect(month.topGenre).not.toBeNull();
    expect(month.movieWatches + month.showWatches).toBe(month.periodWatches);
  });

  it("keeps insights consistent with tops, timeseries, and breakdown", () => {
    const query = { range: "month" };
    const insights = watch("/analytics/insights", query);
    const tops = watch("/analytics/tops/:kind", { ...query, limit: "100" }, { kind: "titles" });
    const buckets = watch("/analytics/timeseries", { ...query, granularity: "hourOfDay" });
    const sources = watch("/analytics/breakdown/:kind", query, { kind: "sources" });
    const sum = (rows: { count: number }[]) => rows.reduce((n, r) => n + r.count, 0);
    expect(sum(tops)).toBe(insights.periodWatches);
    expect(sum(buckets)).toBe(insights.periodWatches);
    expect(sum(sources.items)).toBe(insights.periodWatches);
  });

  it("matches tops, breakdown, and timeseries schemas across query shapes", () => {
    for (const kind of ["titles", "movies", "shows"]) {
      const items = watch("/analytics/tops/:kind", { range: "all" }, { kind });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) WatchTopItemSchema.parse(item);
    }
    const movies = watch("/analytics/tops/:kind", { range: "all" }, { kind: "movies" });
    expect(movies.every((m: { type: string }) => m.type === "movie")).toBe(true);
    const genres = watch("/analytics/tops/:kind", { range: "all", limit: "3" }, { kind: "genres" });
    expect(genres).toHaveLength(3);
    for (const genre of genres) WatchTopItemSchema.parse(genre);

    const byMinutes = watch(
      "/analytics/tops/:kind",
      { range: "all", sort: "minutes" },
      { kind: "titles" },
    );
    expect(byMinutes[0].minutes).toBeGreaterThanOrEqual(byMinutes[1].minutes);

    for (const kind of ["years", "sources"]) {
      const body = WatchBreakdownResponseSchema.parse(
        watch("/analytics/breakdown/:kind", { range: "year" }, { kind }),
      );
      expect(body.items.length).toBeGreaterThan(0);
    }

    expect(watch("/analytics/timeseries", { granularity: "hourOfDay" })).toHaveLength(24);
    expect(watch("/analytics/timeseries", { granularity: "dayOfWeek" })).toHaveLength(7);
    for (const granularity of ["hourOfDay", "dayOfWeek", "day", "week"]) {
      for (const bucket of watch("/analytics/timeseries", { granularity, range: "year" })) {
        WatchTimeBucketSchema.parse(bucket);
      }
    }
  });

  it("paginates and filters recent watches", () => {
    const first = WatchRecentPageSchema.parse(
      watch("/analytics/recent", { page: "1", pageSize: "10" }),
    );
    const second = watch("/analytics/recent", { page: "2", pageSize: "10" });
    expect(first.items).toHaveLength(10);
    expect(first.items[0]!.id).not.toBe(second.items[0].id);
    const movies = watch("/analytics/recent", { type: "movie", limit: "5" });
    expect(movies.items.every((e: any) => e.episode === null)).toBe(true);
    const searched = watch("/analytics/recent", { q: "severance" });
    expect(searched.total).toBe(19);
  });

  it("offers shows to continue with a real next episode", () => {
    const body = WatchContinueResponseSchema.parse(watch("/analytics/continue", { limit: "6" }));
    expect(body.items.length).toBeGreaterThanOrEqual(3);
    expect(body.items.length).toBeLessThanOrEqual(6);
    for (const item of body.items) {
      expect(item.watchedEpisodes).toBeLessThan(item.title.totalEpisodes!);
    }
  });

  it("resolves every listed title to a populated detail", () => {
    const tops = watch("/analytics/tops/:kind", { range: "all", limit: "100" }, { kind: "titles" });
    for (const { id, type } of tops) {
      const detail = WatchTitleDetailSchema.parse(
        watch("/analytics/titles/:id", {}, { id }),
      );
      expect(detail.eventCount).toBeGreaterThan(0);
      expect(detail.title.overview).toBeTruthy();
      if (type === "show") expect(detail.seasons.length).toBeGreaterThan(0);
      else expect(detail.seasons).toEqual([]);
    }
  });

  it("returns a parseable stub for an unknown title", () => {
    const detail = WatchTitleDetailSchema.parse(
      watch("/analytics/titles/:id", {}, { id: "missing" }),
    );
    expect(detail.title.id).toBe("missing");
    expect(detail.eventCount).toBe(0);
  });

  it("has rewind stats for each of the last 24 months", () => {
    for (const period of lastMonths(24)) {
      const stats = watch("/analytics/rewind/stats", { period, tz: "UTC" });
      expect(stats.domain).toBe("watch");
      expect(stats.period).toBe(period);
      expect(stats.totalWatches, period).toBeGreaterThan(0);
      expect(stats.topTitles.length).toBeGreaterThan(0);
      expect(stats.peakHour).not.toBeNull();
      expect(stats.monthly).toBeDefined();
    }
    const year = String(new Date().getUTCFullYear() - 1);
    const annual = watch("/analytics/rewind/stats", { period: year });
    expect(annual.totalWatches).toBeGreaterThan(50);
    expect(annual.monthly).toHaveLength(12);
  });

  it("reports the rewind insight with cache state", () => {
    const [period] = lastMonths(1);
    const insight = RewindInsightResponseSchema.parse(
      watch("/analytics/rewind/ai", { period }),
    );
    expect(insight.cached).toBe(true);
    expect(insight.content).toContain("<");
    expect(watch("/analytics/rewind/ai", { period, forceRedo: "true" }).cached).toBe(false);
    RewindInsightResponseSchema.parse(watch("/analytics/rewind/ai", { period: "2001" }));
  });

  it("reports every provider as disconnected", () => {
    for (const provider of ["trakt", "anilist", "mal", "kitsu", "bangumi", "shikimori", "letterboxd"]) {
      expect(watch(`/${provider}/status`).connected).toBe(false);
    }
    expect(watch("/imports/active")).toBeNull();
    expect(watch("/sync-status").active).toBe(false);
  });

  it("matches trending and catalog search schemas", () => {
    expect(MediaTrendingShelfSchema.parse(watch("/trending/tmdb")).items.length).toBeGreaterThan(5);
    const hits = WatchCatalogSearchResponseSchema.parse(watch("/catalog/search", { q: "dune" }));
    expect(hits.items.map((i) => i.name)).toContain("Dune: Part Two");
    expect(watch("/catalog/search", {}).items).toEqual([]);
  });
});

describe("demo date handling", () => {
  it("leaves no month-long hole in either history", async () => {
    const { watchEvents } = await import("../../src/demo/fixtures/watch-events");
    const { readEvents } = await import("../../src/demo/fixtures/read-events");
    for (const dates of [
      watchEvents().map((e) => e.at.getTime()),
      readEvents().map((e) => e.at.getTime()),
    ]) {
      const horizon = Date.now() - 800 * 24 * 60 * 60 * 1000;
      const inWindow = dates.filter((at) => at >= horizon).sort((a, b) => a - b);
      const gaps = inWindow.slice(1).flatMap((at, i) => {
        const days = (at - inWindow[i]!) / (24 * 60 * 60 * 1000);
        const ago = (Date.now() - at) / (24 * 60 * 60 * 1000);
        return days > 26 ? [`${Math.round(days)}d ending ${Math.round(ago)}d ago`] : [];
      });
      expect(gaps).toEqual([]);
    }
  });

  it("computes dates at call time rather than import time", () => {
    const shift = (iso: string) => new Date(iso).getTime();
    const before = shift(watch("/analytics/overview").latestWatchAt);
    const readBefore = shift(read("/analytics/overview").latestReadAt);
    vi.useFakeTimers({ now: Date.now() + 90 * 24 * 60 * 60 * 1000 });
    const after = shift(watch("/analytics/overview").latestWatchAt);
    const readAfter = shift(read("/analytics/overview").latestReadAt);
    expect(after - before).toBeGreaterThan(80 * 24 * 60 * 60 * 1000);
    expect(readAfter - readBefore).toBeGreaterThan(80 * 24 * 60 * 60 * 1000);
  });

  it("keeps a live streak in the first minutes of a UTC day", () => {
    vi.useFakeTimers({ now: new Date("2026-03-10T00:05:00.000Z") });
    expect(watch("/analytics/overview", { tz: "UTC" }).streakDays).toBeGreaterThan(0);
    expect(read("/analytics/overview", { tz: "UTC" }).streakDays).toBeGreaterThan(0);
  });
});
