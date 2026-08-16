import { beforeEach, describe, expect, it, vi } from "vitest";
import { LetterboxdScrapeSyncService } from "../../src/watch/letterboxd/letterboxd-scrape-sync.service";
import { LETTERBOXD_SCRAPER_DEFINITION } from "../../src/scraper/letterboxd-default-config";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { ScraperProvidersService } from "../../src/scraper/scraper-providers.service";
import type { ScraperEngineService } from "../../src/scraper/scraper-engine.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { LetterboxdConnectService } from "../../src/watch/letterboxd/letterboxd-connect.service";
import type { LetterboxdService } from "../../src/watch/imports/letterboxd.service";
import { watchedAtDayUtc } from "../../src/watch/imports/letterboxd-keys";

vi.mock("../../src/watch/tmdb/tmdb.constants", () => ({
  TMDB_REQUEST_PACE_MS: 0,
}));

describe("LetterboxdScrapeSyncService", () => {
  let prisma: {
    watchEvent: { findMany: ReturnType<typeof vi.fn> };
    sourceConnection: { update: ReturnType<typeof vi.fn> };
  };
  let connect: { getStatus: ReturnType<typeof vi.fn> };
  let providers: {
    getPublishedDefinition: ReturnType<typeof vi.fn>;
    buildMacroContext: ReturnType<typeof vi.fn>;
  };
  let engine: { run: ReturnType<typeof vi.fn> };
  let catalog: {
    upsertTitle: ReturnType<typeof vi.fn>;
    recordWatch: ReturnType<typeof vi.fn>;
    rebuildWatchHourBuckets: ReturnType<typeof vi.fn>;
  };
  let enrichment: { enqueueTitle: ReturnType<typeof vi.fn> };
  let letterboxd: { repairLetterboxdDuplicates: ReturnType<typeof vi.fn> };
  let service: LetterboxdScrapeSyncService;

  beforeEach(() => {
    prisma = {
      watchEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            dedupeKey: "letterboxd_csv:watch:fight-club:1999:2024-08-15",
            watchedAt: watchedAtDayUtc("2024-08-15"),
            title: { name: "Fight Club" },
          },
        ]),
      },
      sourceConnection: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    connect = {
      getStatus: vi.fn().mockResolvedValue({
        connected: true,
        username: "username",
      }),
    };
    providers = {
      getPublishedDefinition: vi.fn().mockResolvedValue(LETTERBOXD_SCRAPER_DEFINITION),
      buildMacroContext: vi.fn().mockReturnValue({
        "user.letterboxdId": "username",
      }),
    };
    engine = {
      run: vi.fn(async (_config, _macros, opts) => {
        const action = await opts.onPage(
          [
            {
              title: "Fight Club",
              year: "1999",
              date: "2024-08-15",
              rating: "4",
              slug: "fight-club",
            },
            {
              title: "The Matrix",
              year: "1999",
              date: "2024-08-10",
              rating: "5",
              slug: "the-matrix",
            },
          ],
          1,
          "https://letterboxd.com/username/films/diary/page/1/",
        );
        expect(action).toBe("stop");
      }),
    };
    catalog = {
      upsertTitle: vi.fn().mockResolvedValue({ id: "title-1" }),
      recordWatch: vi.fn().mockResolvedValue({}),
      rebuildWatchHourBuckets: vi.fn().mockResolvedValue(undefined),
    };
    enrichment = { enqueueTitle: vi.fn() };
    letterboxd = {
      repairLetterboxdDuplicates: vi.fn().mockResolvedValue({
        scanned: 0,
        groups: 0,
        merged: 0,
        migrated: 0,
      }),
    };

    service = makeService({ configured: () => false });
  });

  function makeService(tmdb: {
    configured: () => boolean;
    searchMovie?: ReturnType<typeof vi.fn>;
  }) {
    return new LetterboxdScrapeSyncService(
      prisma as unknown as PrismaService,
      connect as unknown as LetterboxdConnectService,
      providers as unknown as ScraperProvidersService,
      engine as unknown as ScraperEngineService,
      catalog as unknown as CatalogService,
      enrichment as unknown as EnrichmentService,
      letterboxd as unknown as LetterboxdService,
      tmdb as import("../../src/watch/tmdb/tmdb.service").TmdbService,
    );
  }

  it("imports new rows and stops when known entry is seen", async () => {
    const result = await service.syncUser("user-1", "username");

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.stoppedEarly).toBe(true);
    expect(catalog.recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "letterboxd",
        dedupeKey: "letterboxd_csv:watch:the-matrix:1999:2024-08-10",
      }),
    );
    expect(letterboxd.repairLetterboxdDuplicates).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("skips scrape rows that match CSV imports via equiv key when year differs", async () => {
    prisma.watchEvent.findMany.mockResolvedValue([
      {
        dedupeKey: "letterboxd_csv:watch:midsommar:2019:2024-07-22",
        watchedAt: watchedAtDayUtc("2024-07-22"),
        title: { name: "Midsommar" },
      },
    ]);

    engine.run.mockImplementation(async (_config, _macros, opts) => {
      const action = await opts.onPage(
        [
          {
            title: "Midsommar",
            date: "2024-07-22",
            rating: "4",
            slug: "midsommar",
          },
        ],
        1,
        "https://letterboxd.com/username/films/diary/page/1/",
      );
      expect(action).toBe("stop");
    });

    const result = await service.syncUser("user-1", "username");

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.stoppedEarly).toBe(true);
    expect(catalog.recordWatch).not.toHaveBeenCalled();
    expect(letterboxd.repairLetterboxdDuplicates).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("passes a TMDB search id into upsertTitle when configured", async () => {
    const searchMovie = vi.fn().mockResolvedValue({ id: 603 });
    service = makeService({ configured: () => true, searchMovie });

    const result = await service.syncUser("user-1", "username");

    expect(result.imported).toBe(1);
    expect(searchMovie).toHaveBeenCalledWith("The Matrix", 1999);
    expect(catalog.upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({ tmdbId: 603, name: "The Matrix" }),
    );
  });

  it("continues with tmdbId null when searchMovie rejects", async () => {
    const searchMovie = vi.fn().mockRejectedValue(new Error("TMDB down"));
    service = makeService({ configured: () => true, searchMovie });

    const result = await service.syncUser("user-1", "username");

    expect(result.imported).toBe(1);
    expect(catalog.upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({ tmdbId: null, name: "The Matrix" }),
    );
  });
});
