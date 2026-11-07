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

describe("LetterboxdScrapeSyncService paging and bookkeeping", () => {
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

  describe("pagination", () => {
    const known = {
      dedupeKey: "letterboxd_csv:watch:known:1999:2024-01-01",
      watchedAt: new Date("2024-01-01T12:00:00.000Z"),
      title: { name: "Known" },
    };

    it("continues across pages with no known entry", async () => {
      pages([film("A", "2024-03-01")], [film("B", "2024-02-01")]);
      const result = await service.syncUser("u1", "x");
      expect(pageActions).toEqual(["continue", "continue"]);
      expect(result.imported).toBe(2);
    });

    it("stops on the page holding a known entry but imports that page", async () => {
      watchFindMany.mockResolvedValue([known]);
      pages(
        [film("A", "2024-03-01")],
        [film("Known", "2024-01-01"), film("B", "2023-12-01")],
        [film("Never", "2023-01-01")],
      );
      const result = await service.syncUser("u1", "x");
      expect(pageActions).toEqual(["continue", "stop"]);
      expect(result).toEqual({ imported: 2, skipped: 1, stoppedEarly: true });
      expect(upsertTitle.mock.calls.map((c) => c[0].name)).toEqual(["A", "B"]);
    });

    it("keeps paging past known entries when configured", async () => {
      watchFindMany.mockResolvedValue([known]);
      getPublishedDefinition.mockResolvedValue(NO_STOP);
      pages([film("Known", "2024-01-01")], [film("A", "2023-01-01")]);
      const result = await service.syncUser("u1");
      expect(pageActions).toEqual(["continue", "continue"]);
      expect(result).toEqual({ imported: 1, skipped: 1, stoppedEarly: false });
    });

    it("handles an empty page", async () => {
      pages([]);
      await expect(service.syncUser("u1", "x")).resolves.toEqual(zero);
    });
  });

  describe("post-sync bookkeeping", () => {
    it("advances the cursor to the newest imported date", async () => {
      pages([
        film("A", "2024-01-05"),
        film("B", "2024-03-01"),
        film("C", "2024-02-01"),
      ]);
      await service.syncUser("u1", "x");
      expect(connectionUpdate).toHaveBeenCalledWith({
        where: { userId_provider: { userId: "u1", provider: "letterboxd" } },
        data: { lastSyncedAt: expect.any(Date), syncCursor: "2024-03-01" },
      });
    });

    it("rebuilds hours and enqueues each imported title", async () => {
      upsertTitle
        .mockResolvedValueOnce({ id: "t1" })
        .mockResolvedValueOnce({ id: "t2" });
      pages([film("A", "2024-01-01"), film("B", "2024-01-02")]);
      await service.syncUser("u1", "x");
      expect(rebuild).toHaveBeenCalledTimes(1);
      expect(rebuild).toHaveBeenCalledWith("u1");
      expect(enqueueTitle.mock.calls.map((c) => c[0])).toEqual(["t1", "t2"]);
    });

    it("touches lastSyncedAt only when nothing was imported", async () => {
      await service.syncUser("u1", "x");
      expect(connectionUpdate.mock.calls[0][0].data).toEqual({
        lastSyncedAt: expect.any(Date),
      });
      expect(rebuild).not.toHaveBeenCalled();
      expect(enqueueTitle).not.toHaveBeenCalled();
      expect(repair).toHaveBeenCalledWith("u1");
    });
  });

  describe("TMDB", () => {
    it("searches with the parsed title and year", async () => {
      tmdbConfigured = true;
      searchMovie.mockResolvedValue({ id: 7 });
      pages([film("A", "2024-01-01")]);
      await service.syncUser("u1", "x");
      expect(searchMovie).toHaveBeenCalledWith("A", 1999);
      expect(upsertTitle.mock.calls[0][0].tmdbId).toBe(7);
    });

    it("does not search for rows it skips", async () => {
      tmdbConfigured = true;
      pages([{ title: "A", date: "not-a-date" }]);
      await service.syncUser("u1", "x");
      expect(searchMovie).not.toHaveBeenCalled();
    });

    it("stores a null id when nothing matches", async () => {
      tmdbConfigured = true;
      pages([film("A", "2024-01-01")]);
      await service.syncUser("u1", "x");
      expect(upsertTitle.mock.calls[0][0].tmdbId).toBeNull();
    });
  });
});
