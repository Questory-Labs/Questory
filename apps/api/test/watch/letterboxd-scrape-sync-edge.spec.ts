import { beforeEach, describe, expect, it, vi } from "vitest";
import { LetterboxdScrapeSyncService } from "../../src/watch/letterboxd/letterboxd-scrape-sync.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { ScraperProvidersService } from "../../src/scraper/scraper-providers.service";
import type { ScraperEngineService } from "../../src/scraper/scraper-engine.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { LetterboxdConnectService } from "../../src/watch/letterboxd/letterboxd-connect.service";
import type { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

vi.mock("../../src/watch/tmdb/tmdb.constants", () => ({
  TMDB_REQUEST_PACE_MS: 0,
}));

type Row = Record<string, string | null>;
const STOP = { stop: { onKnownEntry: true } };
const NO_STOP = { stop: { onKnownEntry: false } };
const film = (title: string, date: string, extra: Row = {}): Row => ({
  title,
  date,
  year: "1999",
  ...extra,
});

describe("LetterboxdScrapeSyncService edge cases", () => {
  const watchFindMany = vi.fn();
  const connectionUpdate = vi.fn();
  const getStatus = vi.fn();
  const listConnections = vi.fn();
  const getPublishedDefinition = vi.fn();
  const buildMacroContext = vi.fn();
  const run = vi.fn();
  const upsertTitle = vi.fn();
  const recordWatch = vi.fn();
  const rebuild = vi.fn();
  const enqueueTitle = vi.fn();
  const repair = vi.fn();
  const searchMovie = vi.fn();
  const isDomainEnabled = vi.fn();
  const isSourceEnabled = vi.fn();
  let tmdbConfigured = false;
  let pageActions: string[] = [];
  let service: LetterboxdScrapeSyncService;

  const pages = (...batches: Row[][]) => {
    run.mockImplementation(async (_config, _macros, opts) => {
      for (const [i, rows] of batches.entries()) {
        const action = await opts.onPage(rows, i + 1, `page-${i + 1}`);
        pageActions.push(action);
        if (action === "stop") break;
      }
    });
  };

  beforeEach(() => {
    tmdbConfigured = false;
    pageActions = [];
    watchFindMany.mockReset().mockResolvedValue([]);
    connectionUpdate.mockReset().mockResolvedValue({});
    getStatus.mockReset().mockResolvedValue({ username: "cinephile" });
    listConnections.mockReset().mockResolvedValue([]);
    getPublishedDefinition.mockReset().mockResolvedValue(STOP);
    buildMacroContext.mockReset().mockReturnValue({ base: "x" });
    run.mockReset().mockResolvedValue(undefined);
    upsertTitle.mockReset().mockResolvedValue({ id: "t1" });
    recordWatch.mockReset().mockResolvedValue({});
    rebuild.mockReset().mockResolvedValue(undefined);
    enqueueTitle.mockReset();
    repair.mockReset().mockResolvedValue({});
    searchMovie.mockReset().mockResolvedValue(null);
    isDomainEnabled.mockReset().mockResolvedValue(true);
    isSourceEnabled.mockReset().mockResolvedValue(true);

    service = new LetterboxdScrapeSyncService(
      {
        watchEvent: { findMany: watchFindMany },
        sourceConnection: { update: connectionUpdate },
      } as unknown as PrismaService,
      { getStatus, listConnections } as unknown as LetterboxdConnectService,
      {
        getPublishedDefinition,
        buildMacroContext,
      } as unknown as ScraperProvidersService,
      { run } as unknown as ScraperEngineService,
      {
        upsertTitle,
        recordWatch,
        rebuildWatchHourBuckets: rebuild,
      } as unknown as CatalogService,
      { enqueueTitle } as unknown as EnrichmentService,
      { repairLetterboxdDuplicates: repair } as unknown as LetterboxdService,
      {
        configured: () => tmdbConfigured,
        searchMovie,
      } as unknown as TmdbService,
      { isDomainEnabled, isSourceEnabled } as unknown as FeatureFlagsService,
    );
  });

  const zero = { imported: 0, skipped: 0, stoppedEarly: false };

  describe("gating", () => {
    it("syncUser no-ops when the watch domain is off", async () => {
      isDomainEnabled.mockResolvedValue(false);
      await expect(service.syncUser("u1", "x")).resolves.toEqual(zero);
      expect(isDomainEnabled).toHaveBeenCalledWith("watch");
      expect(run).not.toHaveBeenCalled();
    });

    it("syncUser no-ops when the scrape source is off", async () => {
      isSourceEnabled.mockResolvedValue(false);
      await expect(service.syncUser("u1", "x")).resolves.toEqual(zero);
      expect(isSourceEnabled).toHaveBeenCalledWith("letterboxdScrape");
      expect(run).not.toHaveBeenCalled();
    });

    it("syncUser no-ops without a published definition", async () => {
      getPublishedDefinition.mockResolvedValue(null);
      await expect(service.syncUser("u1", "x")).resolves.toEqual(zero);
      expect(run).not.toHaveBeenCalled();
      expect(connectionUpdate).not.toHaveBeenCalled();
    });

    it("syncUser no-ops without any username", async () => {
      getStatus.mockResolvedValue({ username: null });
      await expect(service.syncUser("u1")).resolves.toEqual(zero);
      expect(run).not.toHaveBeenCalled();
    });

    it.each([
      ["domain", isDomainEnabled],
      ["source", isSourceEnabled],
    ])("syncAll no-ops with the %s flag off", async (_label, flag) => {
      flag.mockResolvedValue(false);
      await expect(service.syncAll()).resolves.toEqual({
        users: 0,
        imported: 0,
        skipped: 0,
        stopped: 0,
      });
      expect(listConnections).not.toHaveBeenCalled();
    });

    it("syncAll no-ops without a published definition", async () => {
      getPublishedDefinition.mockResolvedValue(null);
      await expect(service.syncAll()).resolves.toEqual({
        users: 0,
        imported: 0,
        skipped: 0,
        stopped: 0,
      });
      expect(listConnections).not.toHaveBeenCalled();
    });
  });

  describe("syncAll", () => {
    it("aggregates results and shares one definition", async () => {
      listConnections.mockResolvedValue([
        { userId: "u1", externalUserId: "one" },
        { userId: "u2", externalUserId: "two" },
      ]);
      pages([film("A", "2024-01-01")]);
      await expect(service.syncAll()).resolves.toEqual({
        users: 2,
        imported: 2,
        skipped: 0,
        stopped: 0,
      });
      expect(getPublishedDefinition).toHaveBeenCalledTimes(1);
      expect(recordWatch.mock.calls.map((c) => c[0].userId)).toEqual([
        "u1",
        "u2",
      ]);
    });

    it("does not scrape a connection without a username", async () => {
      listConnections.mockResolvedValue([
        { userId: "u1", externalUserId: null },
      ]);
      await service.syncAll();
      expect(run).not.toHaveBeenCalled();
    });

    it("counts users stopped early", async () => {
      listConnections.mockResolvedValue([
        { userId: "u1", externalUserId: "one" },
      ]);
      watchFindMany.mockResolvedValue([
        {
          dedupeKey: "letterboxd_csv:watch:a:1999:2024-01-01",
          watchedAt: new Date("2024-01-01T12:00:00.000Z"),
          title: { name: "A" },
        },
      ]);
      pages([film("A", "2024-01-01")]);
      const result = await service.syncAll();
      expect(result.stopped).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe("configuration", () => {
    it("prefers an override definition over the published one", async () => {
      await service.syncUser("u1", "x", NO_STOP as never);
      expect(getPublishedDefinition).not.toHaveBeenCalled();
      expect(run.mock.calls[0][0]).toBe(NO_STOP);
    });

    it("uses the stored username when none is passed", async () => {
      await service.syncUser("u1");
      expect(getStatus).toHaveBeenCalledWith("u1");
      expect(buildMacroContext).toHaveBeenCalledWith({
        letterboxdId: "cinephile",
      });
      expect(run.mock.calls[0][1]).toEqual({
        base: "x",
        "user.letterboxdId": "cinephile",
      });
    });

    it("prefers an explicit username over the stored one", async () => {
      await service.syncUser("u1", "explicit");
      expect(run.mock.calls[0][1]["user.letterboxdId"]).toBe("explicit");
    });
  });

  describe("concurrency", () => {
    it("drops an overlapping sync for the same user", async () => {
      let release!: () => void;
      run.mockImplementation(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      const first = service.syncUser("u1", "x");
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
      await expect(service.syncUser("u1", "x")).resolves.toEqual(zero);
      expect(run).toHaveBeenCalledTimes(1);
      release();
      await first;
    });

    it("allows different users to sync concurrently", async () => {
      let release!: () => void;
      run.mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      const first = service.syncUser("u1", "x");
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
      await service.syncUser("u2", "y");
      expect(run).toHaveBeenCalledTimes(2);
      release();
      await first;
    });

    it("releases the lock after an engine failure", async () => {
      run.mockRejectedValueOnce(new Error("blocked"));
      await expect(service.syncUser("u1", "x")).rejects.toThrow("blocked");
      expect(connectionUpdate).not.toHaveBeenCalled();
      expect(repair).not.toHaveBeenCalled();
      await service.syncUser("u1", "x");
      expect(run).toHaveBeenCalledTimes(2);
    });
  });

  describe("row handling", () => {
    it("loads known keys for the current user only", async () => {
      await service.syncUser("u1", "x");
      expect(watchFindMany.mock.calls[0][0].where).toEqual({
        userId: "u1",
        OR: [
          { source: "letterboxd" },
          { source: "letterboxd_csv" },
          { dedupeKey: { startsWith: "letterboxd_csv:" } },
        ],
      });
    });

    it.each([
      ["no title", { title: null, date: "2024-01-01" }],
      ["blank title", { title: "  ", date: "2024-01-01" }],
      ["no date", { title: "A", date: null }],
      ["blank date", { title: "A", date: "  " }],
      ["unparseable date", { title: "A", date: "not-a-date" }],
    ])("skips a row with %s", async (_label, row) => {
      pages([row]);
      const result = await service.syncUser("u1", "x");
      expect(result).toEqual({ imported: 0, skipped: 1, stoppedEarly: false });
      expect(upsertTitle).not.toHaveBeenCalled();
    });

    it("nulls non-numeric rating and missing year", async () => {
      pages([{ title: "A", date: "2024-01-01", rating: "great", year: null }]);
      await service.syncUser("u1", "x");
      expect(upsertTitle.mock.calls[0][0].year).toBeNull();
      expect(recordWatch.mock.calls[0][0].rating).toBeNull();
      expect(recordWatch.mock.calls[0][0].dedupeKey).toBe(
        "letterboxd_csv:watch:a::2024-01-01",
      );
    });

    it("writes the full scraped watch", async () => {
      const row = film("A", "2024-01-01", { rating: "4.5" });
      pages([row]);
      await service.syncUser("u1", "x");
      expect(upsertTitle).toHaveBeenCalledWith({
        type: "movie",
        name: "A",
        year: 1999,
        tmdbId: null,
      });
      const call = recordWatch.mock.calls[0][0];
      expect(call).toMatchObject({
        userId: "u1",
        titleId: "t1",
        watchedAt: new Date("2024-01-01T12:00:00.000Z"),
        source: "letterboxd",
        dedupeKey: "letterboxd_csv:watch:a:1999:2024-01-01",
        action: "watch",
        rating: 4.5,
        precision: "day",
      });
      expect(JSON.parse(call.rawPayload)).toMatchObject({ title: "A" });
    });

    it("resolves diary header rows into dates", async () => {
      pages([
        {
          title: "A",
          month: "Aug",
          yearHeader: "2024",
          day: "5",
          filmHref: "/film/a-1999/",
        },
        { title: "B", day: "4", filmHref: "/film/b-2001/" },
      ]);
      await service.syncUser("u1", "x");
      expect(recordWatch.mock.calls.map((c) => c[0].dedupeKey)).toEqual([
        "letterboxd_csv:watch:a:1999:2024-08-05",
        "letterboxd_csv:watch:b:2001:2024-08-04",
      ]);
    });

    it("dedupes a row repeated within one sync", async () => {
      pages([film("A", "2024-01-01"), film("A", "2024-01-01")]);
      const result = await service.syncUser("u1", "x");
      expect(recordWatch).toHaveBeenCalledTimes(1);
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("recognises legacy CSV keys as known", async () => {
      watchFindMany.mockResolvedValue([
        {
          dedupeKey: "letterboxd_csv:diary:a:2024-01-01",
          watchedAt: new Date("2024-01-01T12:00:00.000Z"),
          title: { name: "A" },
        },
      ]);
      pages([film("A", "2024-01-01")]);
      const result = await service.syncUser("u1", "x");
      expect(recordWatch).not.toHaveBeenCalled();
      expect(result.stoppedEarly).toBe(true);
    });

    it("imports a rewatch of a known film on a new day", async () => {
      watchFindMany.mockResolvedValue([
        {
          dedupeKey: "letterboxd_csv:watch:a:1999:2024-01-01",
          watchedAt: new Date("2024-01-01T12:00:00.000Z"),
          title: { name: "A" },
        },
      ]);
      pages([film("A", "2024-06-01")]);
      const result = await service.syncUser("u1", "x");
      expect(result).toEqual({ imported: 1, skipped: 0, stoppedEarly: false });
    });

    it("propagates a catalog write failure without marking synced", async () => {
      recordWatch.mockRejectedValue(new Error("db"));
      pages([film("A", "2024-01-01")]);
      await expect(service.syncUser("u1", "x")).rejects.toThrow("db");
      expect(connectionUpdate).not.toHaveBeenCalled();
    });
  });
});
