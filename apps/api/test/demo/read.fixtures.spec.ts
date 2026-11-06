import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MediaTrendingShelfSchema,
  ReadBreakdownResponseSchema,
  ReadInsightsSchema,
  ReadLibraryPageSchema,
  ReadOverviewSchema,
  ReadRecentPageSchema,
  ReadTimeBucketSchema,
  ReadTitleDetailSchema,
  ReadTitleTimeseriesSchema,
  ReadTopItemSchema,
  RewindInsightResponseSchema,
} from "@questorylabs/shared";
import { read, lastMonths } from "./watch-read.helpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("demo read fixtures", () => {
  it("matches the overview and insights schemas with populated data", () => {
    const overview = ReadOverviewSchema.parse(read("/analytics/overview"));
    expect(overview.totalEvents).toBeGreaterThan(300);
    expect(overview.streakDays).toBeGreaterThanOrEqual(7);
    for (const range of ["day", "week", "month", "year", "all"]) {
      ReadInsightsSchema.parse(read("/analytics/insights", { range, tz: "UTC" }));
    }
    const manhwa = read("/analytics/insights", { range: "all", format: "manhwa" });
    const all = read("/analytics/insights", { range: "all" });
    expect(manhwa.format).toBe("manhwa");
    expect(manhwa.periodEvents).toBeLessThan(all.periodEvents);
  });

  it("keeps insights consistent with tops, timeseries, and breakdown", () => {
    const query = { range: "month" };
    const insights = read("/analytics/insights", query);
    const sum = (rows: { count: number }[]) => rows.reduce((n, r) => n + r.count, 0);
    expect(sum(read("/analytics/tops/:kind", { ...query, limit: "100" }, { kind: "titles" }))).toBe(
      insights.periodEvents,
    );
    expect(sum(read("/analytics/timeseries", { ...query, granularity: "dayOfWeek" }))).toBe(
      insights.periodEvents,
    );
    expect(sum(read("/analytics/breakdown/:kind", query, { kind: "formats" }).items)).toBe(
      insights.periodEvents,
    );
  });

  it("matches tops, breakdown, and timeseries schemas", () => {
    for (const kind of ["titles", "genres", "formats"]) {
      const items = read("/analytics/tops/:kind", { range: "all" }, { kind });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) ReadTopItemSchema.parse(item);
    }
    for (const kind of ["years", "sources", "formats", "statuses"]) {
      const body = ReadBreakdownResponseSchema.parse(
        read("/analytics/breakdown/:kind", { range: "year" }, { kind }),
      );
      expect(body.items.length).toBeGreaterThan(0);
    }
    for (const granularity of ["hourOfDay", "dayOfWeek", "day", "week"]) {
      for (const bucket of read("/analytics/timeseries", { granularity, range: "year" })) {
        ReadTimeBucketSchema.parse(bucket);
      }
    }
  });

  it("paginates recent events", () => {
    const body = ReadRecentPageSchema.parse(read("/analytics/recent", { pageSize: "7" }));
    expect(body.items).toHaveLength(7);
    expect(body.total).toBeGreaterThan(7);
  });

  it("resolves library titles to populated details and weekly series", () => {
    const library = ReadLibraryPageSchema.parse(read("/library", { pageSize: "100" }));
    for (const item of library.items) {
      const detail = ReadTitleDetailSchema.parse(
        read("/analytics/titles/:id", {}, { id: item.title.id }),
      );
      expect(detail.title.name).toBe(item.title.name);
      expect(detail.listStatus).toBe(item.listStatus);
    }
    const series = ReadTitleTimeseriesSchema.parse(
      read(
        "/analytics/titles/:id/timeseries",
        { granularity: "week", weeks: "8" },
        { id: "demo-read-one-piece" },
      ),
    );
    expect(series.items).toHaveLength(8);
    expect(series.items.some((i) => i.count > 0)).toBe(true);
  });

  it("returns parseable stubs for an unknown title", () => {
    const detail = ReadTitleDetailSchema.parse(
      read("/analytics/titles/:id", {}, { id: "missing" }),
    );
    expect(detail.eventCount).toBe(0);
    ReadTitleTimeseriesSchema.parse(
      read("/analytics/titles/:id/timeseries", {}, { id: "missing" }),
    );
  });

  it("filters, sorts, and pages the library", () => {
    const all = read("/library", { pageSize: "100" });
    expect(all.statusCounts.map((s: { status: string }) => s.status).sort()).toEqual(
      ["completed", "dropped", "paused", "planning", "reading", "repeating"],
    );
    const reading = read("/library", { status: "reading", pageSize: "6" });
    expect(reading.items).toHaveLength(6);
    expect(reading.statusCounts).toEqual(all.statusCounts);
    expect(reading.items.every((i: any) => i.listStatus === "reading")).toBe(true);
    expect(read("/library", { format: "manhwa" }).items.every((i: any) => i.title.format === "manhwa")).toBe(true);
    expect(read("/library", { category: "comic" }).total).toBe(3);
    expect(read("/library", { q: "berserk" }).total).toBe(1);
    expect(read("/library", { genre: "horror" }).total).toBeGreaterThan(0);
    expect(read("/library", { minScore: "9" }).items.every((i: any) => i.score >= 9)).toBe(true);
    const byScore = read("/library", { sort: "score" }).items;
    expect(byScore[0].score).toBe(10);
    const byTitle = read("/library", { sort: "title" }).items.map((i: any) => i.title.name);
    expect(byTitle).toEqual([...byTitle].sort((a, b) => a.localeCompare(b)));
    expect(read("/library", { page: "99" }).items).toEqual([]);
  });

  it("has rewind stats for each of the last 24 months", () => {
    for (const period of lastMonths(24)) {
      const stats = read("/analytics/rewind/stats", { period, tz: "UTC" });
      expect(stats.domain).toBe("read");
      expect(stats.totalEvents, period).toBeGreaterThan(0);
      expect(stats.formatBreakdown.length).toBeGreaterThan(0);
      expect(stats.statusBreakdown).toBeDefined();
    }
  });

  it("reports the rewind insight with cache state", () => {
    const [period] = lastMonths(1);
    const insight = RewindInsightResponseSchema.parse(read("/analytics/rewind/ai", { period }));
    expect(insight.cached).toBe(true);
    expect(read("/analytics/rewind/ai", { period, forceRedo: "true" }).cached).toBe(false);
  });

  it("reports every provider as disconnected", () => {
    for (const provider of ["anilist", "mal", "kitsu", "bangumi", "shikimori"]) {
      expect(read(`/${provider}/status`).connected).toBe(false);
    }
    expect(read("/sync-status").active).toBe(false);
  });

  it("matches the trending schema", () => {
    expect(MediaTrendingShelfSchema.parse(read("/trending/anilist")).meta.source).toBe("anilist");
  });
});
