import { describe, expect, it } from "vitest";
import {
  MediaTrendingShelfSchema,
  MusicAlbumDetailSchema,
  MusicAlbumListenPageSchema,
  MusicArtistDetailSchema,
  MusicBreakdownResponseSchema,
  MusicCatalogSuggestResponseSchema,
  MusicCorrectionFormSchema,
  MusicHeatmapSchema,
  MusicInsightsSchema,
  MusicMoversResponseSchema,
  MusicOverviewSchema,
  MusicPlayingNowSchema,
  MusicRecentPageSchema,
  MusicScrobblerStatusSchema,
  MusicTimeBucketSchema,
  MusicTopsResponseSchema,
  MusicTrackDetailSchema,
  MusicTrackListenPageSchema,
  RewindInsightResponseSchema,
  type RewindMusicStats,
} from "@questorylabs/shared";
import { z } from "zod";
import { findDemoRoute } from "../../src/demo/demo.routes";
import { musicRoutes } from "../../src/demo/fixtures/music";
import { DEMO_ALBUMS, DEMO_ARTISTS, DEMO_TRACKS } from "../../src/demo/fixtures/music-catalog";
import { demoListens, demoLogSize } from "../../src/demo/fixtures/music-log";

type Query = Record<string, unknown>;

function call(pattern: string, params: Record<string, string> = {}, query: Query = {}): any {
  const route = musicRoutes.find((r) => r.pattern === pattern);
  if (!route) throw new Error(`missing route ${pattern}`);
  return route.respond({ exp: 0, params, query, body: undefined });
}

const TRACK_ID = "demo-track-daft-punk-get-lucky";
const ARTIST_ID = "demo-artist-radiohead";
const ALBUM_ID = "demo-album-in-rainbows";
const A = "/music/analytics";
const BUCKETS = z.array(MusicTimeBucketSchema);
const CURRENT_YEAR = String(new Date().getUTCFullYear());

const SCHEMA_CASES: Array<[string, Record<string, string>, Query, z.ZodTypeAny]> = [
  [`${A}/overview`, {}, {}, MusicOverviewSchema],
  [`${A}/insights`, {}, { range: "week" }, MusicInsightsSchema],
  [`${A}/insights`, {}, { range: "all" }, MusicInsightsSchema],
  [`${A}/playing-now`, {}, {}, MusicPlayingNowSchema],
  [`${A}/breakdown/:kind`, { kind: "years" }, {}, MusicBreakdownResponseSchema],
  [`${A}/breakdown/:kind`, { kind: "services" }, {}, MusicBreakdownResponseSchema],
  ...["artists", "albums", "tracks", "genres", "moods"].map(
    (kind): [string, Record<string, string>, Query, z.ZodTypeAny] => [
      `${A}/tops/:kind`,
      { kind },
      { range: "month" },
      MusicTopsResponseSchema,
    ],
  ),
  ...["hourOfDay", "dayOfWeek", "day", "week"].map(
    (granularity): [string, Record<string, string>, Query, z.ZodTypeAny] => [
      `${A}/timeseries`,
      {},
      { granularity, range: "year" },
      BUCKETS,
    ],
  ),
  [`${A}/heatmap`, {}, {}, MusicHeatmapSchema],
  [`${A}/recent`, {}, {}, MusicRecentPageSchema],
  [`${A}/movers`, {}, {}, MusicMoversResponseSchema],
  [`${A}/movers`, {}, { kind: "tracks", range: "all" }, MusicMoversResponseSchema],
  [`${A}/tracks/:id`, { id: TRACK_ID }, {}, MusicTrackDetailSchema],
  [`${A}/tracks/:id/listens`, { id: TRACK_ID }, {}, MusicTrackListenPageSchema],
  [`${A}/tracks/:id/timeseries`, { id: TRACK_ID }, { granularity: "dayOfWeek" }, BUCKETS],
  [`${A}/tracks/:id/heatmap`, { id: TRACK_ID }, {}, MusicHeatmapSchema],
  [`${A}/artists/:id`, { id: ARTIST_ID }, {}, MusicArtistDetailSchema],
  [`${A}/artists/:id/timeseries`, { id: ARTIST_ID }, { granularity: "hourOfDay" }, BUCKETS],
  [`${A}/albums/:id`, { id: ALBUM_ID }, {}, MusicAlbumDetailSchema],
  [`${A}/albums/:id/listens`, { id: ALBUM_ID }, {}, MusicAlbumListenPageSchema],
  [`${A}/albums/:id/timeseries`, { id: ALBUM_ID }, { granularity: "hourOfDay" }, BUCKETS],
  [`${A}/rewind/ai`, {}, { period: CURRENT_YEAR }, RewindInsightResponseSchema],
  ["/music/catalog/suggest", {}, { kind: "artist", q: "rad" }, MusicCatalogSuggestResponseSchema],
  ["/music/corrections/tracks/:id", { id: TRACK_ID }, {}, MusicCorrectionFormSchema],
  ["/music/corrections/albums/:id", { id: ALBUM_ID }, {}, MusicCorrectionFormSchema],
  ["/music/corrections/artists/:id", { id: ARTIST_ID }, {}, MusicCorrectionFormSchema],
  ["/music/scrobbler/lastfm/status", {}, {}, MusicScrobblerStatusSchema],
  ["/music/trending/sitewide", {}, {}, MediaTrendingShelfSchema],
];

const GARBAGE_QUERIES: Query[] = [
  {
    range: "forever",
    kind: "nope",
    tz: "Not/AZone",
    period: "20xx-99",
    page: "-1",
    pageSize: "1e9",
    limit: "abc",
    granularity: "millennium",
    q: 7,
    source: "pigeon",
  },
  {
    range: ["week"],
    kind: { a: 1 },
    tz: ["UTC"],
    period: ["2024"],
    page: ["1"],
    pageSize: {},
    limit: [],
    granularity: ["day"],
    q: ["x"],
    source: {},
  },
  { period: "2024-13" },
  { period: "0000" },
  { period: "1970" },
];

const UNKNOWN_PARAMS = { id: "does-not-exist", kind: "does-not-exist" };

describe("music demo fixtures", () => {
  it("only declares GET routes, unique, excluding streams and OAuth", () => {
    expect(musicRoutes.every((r) => r.method === "GET")).toBe(true);
    const patterns = musicRoutes.map((r) => r.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
    expect(patterns.some((p) => p.endsWith("/stream"))).toBe(false);
    expect(patterns.some((p) => /authorize|callback/.test(p))).toBe(false);
  });

  it.each(SCHEMA_CASES)("%s %j %j matches the shared schema", (pattern, params, query, schema) => {
    const result = schema.safeParse(call(pattern, params, query));
    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it("covers every route with a schema or an explicit case", () => {
    const covered = new Set(SCHEMA_CASES.map(([pattern]) => pattern));
    const explicit = new Set([`${A}/rewind/stats`, "/music/imports/active"]);
    for (const { pattern } of musicRoutes) {
      expect(covered.has(pattern) || explicit.has(pattern)).toBe(true);
    }
  });

  it.each(GARBAGE_QUERIES)("never throws on garbage query %j", (query) => {
    for (const { pattern, respond } of musicRoutes) {
      expect(
        () => respond({ exp: 0, params: UNKNOWN_PARAMS, query, body: undefined }),
        pattern,
      ).not.toThrow();
    }
  });

  it("falls back to fixtures for unknown ids and invalid kinds", () => {
    const track = call(`${A}/tracks/:id`, { id: "nope" });
    expect(MusicTrackDetailSchema.safeParse(track).success).toBe(true);
    expect(track.track.id).toBe(DEMO_TRACKS[0]!.id);
    expect(call(`${A}/artists/:id`, { id: "nope" }).artist.id).toBe(DEMO_ARTISTS[0]!.id);
    expect(call(`${A}/albums/:id`, { id: "nope" }).album.id).toBe(DEMO_ALBUMS[0]!.id);
    expect(
      MusicTopsResponseSchema.safeParse(call(`${A}/tops/:kind`, { kind: "nope" })).success,
    ).toBe(true);
  });

  it("gives every catalog entity a populated detail page", () => {
    for (const track of DEMO_TRACKS) {
      expect(call(`${A}/tracks/:id`, { id: track.id }).listenCount, track.id).toBeGreaterThan(0);
    }
    for (const artist of DEMO_ARTISTS) {
      const detail = call(`${A}/artists/:id`, { id: artist.id });
      expect(MusicArtistDetailSchema.safeParse(detail).success).toBe(true);
      expect(detail.listenCount, artist.id).toBeGreaterThan(0);
    }
    for (const album of DEMO_ALBUMS) {
      const detail = call(`${A}/albums/:id`, { id: album.id });
      expect(detail.listenCount, album.id).toBeGreaterThan(0);
      expect(detail.topTracks.length).toBeGreaterThan(0);
    }
  });

  it("derives tops, timeseries, heatmap and insights from one log", () => {
    const tops = call(`${A}/tops/:kind`, { kind: "tracks" }, { range: "month", pageSize: "100" });
    const sum = tops.items.reduce((acc: number, i: { count: number }) => acc + i.count, 0);
    expect(tops.periodListens).toBeGreaterThan(0);
    expect(sum).toBe(tops.periodListens);
    const days = call(`${A}/timeseries`, {}, { granularity: "day", range: "month" });
    expect(days.reduce((acc: number, b: { count: number }) => acc + b.count, 0)).toBe(
      tops.periodListens,
    );
    expect(call(`${A}/insights`, {}, { range: "month" }).periodListens).toBe(tops.periodListens);
    const heatmap = call(`${A}/heatmap`, {}, { range: "month" });
    expect(
      heatmap.cells.reduce((acc: number, c: { count: number }) => acc + c.count, 0),
    ).toBe(tops.periodListens);
  });

  it("has a fresh, active and varied overview", () => {
    const overview = call(`${A}/overview`);
    expect(overview.totalListens).toBe(demoListens().length);
    expect(overview.streakDays).toBeGreaterThanOrEqual(30);
    expect(Date.now() - Date.parse(overview.latestListenAt)).toBeLessThan(10 * 60_000);
    expect(call(`${A}/insights`, {}, { range: "day" }).periodListens).toBeGreaterThan(0);
    expect(call(`${A}/insights`, {}, { range: "month" }).newArtists).toBeGreaterThan(0);
    expect(call(`${A}/movers`).movers.length).toBeGreaterThan(0);
  });

  it("pages recent listens without overlap and honours filters", () => {
    const first = call(`${A}/recent`, {}, { page: "1", pageSize: "40" });
    const second = call(`${A}/recent`, {}, { page: "2", pageSize: "40" });
    expect(first.total).toBeGreaterThan(80);
    const ids = new Set(first.items.map((i: { id: string }) => i.id));
    expect(second.items.some((i: { id: string }) => ids.has(i.id))).toBe(false);
    expect(call(`${A}/recent`, {}, { limit: "5" }).pageSize).toBe(5);

    for (const [source, check] of [
      ["lastfm", (c: string) => c === "questory_lastfm"],
      ["imports", (c: string) => c.endsWith("_import")],
      ["listenbrainz", (c: string) => c === "multi-scrobbler"],
    ] as const) {
      const page = call(`${A}/recent`, {}, { source });
      expect(page.total, source).toBeGreaterThan(0);
      expect(page.items.every((i: { submissionClient: string }) => check(i.submissionClient))).toBe(
        true,
      );
    }
    const search = call(`${A}/recent`, {}, { q: " rumours " });
    expect(search.total).toBeGreaterThan(0);
    expect(
      search.items.every((i: { track: { releaseTitle: string } }) => i.track.releaseTitle === "Rumours"),
    ).toBe(true);
    expect(call(`${A}/recent`, {}, { page: "9999" }).items).toEqual([]);
  });

  it("keeps movers and timeseries query shape behaviour", () => {
    expect(call(`${A}/movers`, {}, { limit: "2" }).movers.length).toBeLessThanOrEqual(2);
    const all = call(`${A}/movers`, {}, { range: "all" });
    expect(all.movers).toEqual([]);
    expect(all.concentration.previousShare).toBeNull();
    expect(call(`${A}/timeseries`, {}, { granularity: "hourOfDay" })).toHaveLength(24);
    expect(call(`${A}/timeseries`, {}, { granularity: "dayOfWeek" })[0].label).toBe("Sun");
    expect(call(`${A}/artists/:id/timeseries`, { id: ARTIST_ID }, { granularity: "dayOfWeek" })[0].label).toBe("Mon");
    const allInsights = call(`${A}/insights`, {}, { range: "all" });
    expect(allInsights.compare.previousListens).toBeNull();
  });

  it("builds rewind stats and AI content for the current period", () => {
    const stats: RewindMusicStats = call(`${A}/rewind/stats`, {}, { period: CURRENT_YEAR, tz: "UTC" });
    expect(stats.domain).toBe("music");
    expect(stats.period).toBe(CURRENT_YEAR);
    expect(stats.totalPlays).toBeGreaterThan(0);
    expect(stats.topArtists.length).toBe(5);
    expect(stats.topMoods?.length).toBeGreaterThan(0);
    expect(stats.maxRepeatsInDay?.count).toBeGreaterThan(1);
    const ai = call(`${A}/rewind/ai`, {}, { period: CURRENT_YEAR });
    expect(ai.content.split("\n\n").length).toBeGreaterThan(3);
    expect(ai.content).toContain(`**${stats.totalPlays.toLocaleString("en-US")} plays**`);
    const empty: RewindMusicStats = call(`${A}/rewind/stats`, {}, { period: "2010" });
    expect(empty.totalPlays).toBe(0);
  });

  it("suggests catalog entries and offers new names", () => {
    const hit = call("/music/catalog/suggest", {}, { kind: "artist", q: "Radiohead" });
    expect(hit.items).toEqual([{ id: ARTIST_ID, name: "Radiohead" }]);
    const miss = call("/music/catalog/suggest", {}, { kind: "track", q: "Zzz" });
    expect(miss.items).toEqual([{ name: "Zzz", isNew: true }]);
    expect(call("/music/catalog/suggest", {}, { kind: "album", limit: "2" }).items).toHaveLength(2);
  });

  it("handles real time zones in every zoned route", () => {
    for (const tz of ["Asia/Kolkata", "America/New_York", "Asia/Kathmandu"]) {
      const overview = call(`${A}/overview`, {}, { tz });
      expect(overview.streakDays).toBeGreaterThanOrEqual(30);
      const heatmap = call(`${A}/heatmap`, {}, { range: "month", tz });
      expect(MusicHeatmapSchema.safeParse(heatmap).success).toBe(true);
      const stats: RewindMusicStats = call(`${A}/rewind/stats`, {}, { tz });
      expect(stats.totalPlays).toBeGreaterThan(0);
    }
  });

  it("keeps the import and scrobbler endpoints from triggering follow-ups", () => {
    expect(call("/music/imports/active")).toBeNull();
    expect(call("/music/scrobbler/lastfm/status").lastfm.username).toBeNull();
  });

  it("never exposes image URLs or real identifiers", () => {
    const payload = JSON.stringify([
      call(`${A}/recent`),
      call(`${A}/tops/:kind`, { kind: "artists" }),
      call(`${A}/tracks/:id`, { id: TRACK_ID }),
      call(`${A}/artists/:id`, { id: ARTIST_ID }),
      call(`${A}/albums/:id`, { id: ALBUM_ID }),
      call(`${A}/playing-now`),
      call("/music/trending/sitewide"),
    ]);
    expect(payload).not.toMatch(/https?:/);
    expect(payload).not.toMatch(/"mbid":"/);
  });

  it("resolves through the demo route matcher", () => {
    const listens = findDemoRoute("GET", `${A}/tracks/${TRACK_ID}/listens`, musicRoutes);
    expect(listens?.route.pattern).toBe(`${A}/tracks/:id/listens`);
    expect(listens?.params.id).toBe(TRACK_ID);
    expect(findDemoRoute("GET", `${A}/rewind/stats`, musicRoutes)?.route.pattern).toBe(
      `${A}/rewind/stats`,
    );
    expect(findDemoRoute("POST", "/music/imports", musicRoutes)).toBeNull();
    expect(findDemoRoute("GET", `${A}/playing-now/stream`, musicRoutes)).toBeNull();
  });

  it("responds fast enough for a synchronous middleware", () => {
    const timings: Array<[string, number]> = [];
    const routes: Array<[string, Record<string, string>, Query]> = [
      [`${A}/overview`, {}, { tz: "Asia/Kolkata" }],
      [`${A}/insights`, {}, { range: "all", tz: "Asia/Kolkata" }],
      [`${A}/timeseries`, {}, { granularity: "day", range: "all", tz: "Asia/Kolkata" }],
      [`${A}/heatmap`, {}, { range: "all", tz: "Asia/Kolkata" }],
      [`${A}/rewind/stats`, {}, { tz: "Asia/Kolkata" }],
      [`${A}/recent`, {}, {}],
    ];
    for (const [pattern, params, query] of routes) {
      const start = performance.now();
      call(pattern, params, query);
      timings.push([pattern, Math.round(performance.now() - start)]);
    }
    expect(Math.max(...timings.map(([, ms]) => ms))).toBeLessThan(1000);
  });

  it("computes dates at call time from a compact log", () => {
    expect(demoLogSize()).toBeGreaterThan(3000);
    const a = demoListens();
    const b = demoListens();
    expect(a[0]).not.toBe(b[0]);
    expect(a.every((l, i) => i === 0 || l.at <= a[i - 1]!.at)).toBe(true);
    expect(a[0]!.at.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
