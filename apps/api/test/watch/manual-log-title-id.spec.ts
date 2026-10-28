import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { WatchCatalogLogSchema } from "@questorylabs/shared";
import { ManualService } from "../../src/watch/manual/manual.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { AnilistSearch } from "../../src/watch/manual/anilist-search";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";

describe("ManualService.log with titleId", () => {
  const findTitleSummary = vi.fn();
  const upsertEpisode = vi.fn();
  const recordWatch = vi.fn();
  const upsertListState = vi.fn();
  const enqueueTitle = vi.fn();
  const getTv = vi.fn();
  let service: ManualService;

  beforeEach(() => {
    for (const fn of [
      findTitleSummary,
      upsertEpisode,
      recordWatch,
      upsertListState,
      enqueueTitle,
      getTv,
    ]) {
      fn.mockReset();
    }
    upsertEpisode.mockResolvedValue({ id: "ep-9", runtimeMinutes: 24 });
    recordWatch.mockResolvedValue({
      id: "ev-1",
      watchedAt: new Date("2026-10-01T12:00:00.000Z"),
    });
    service = new ManualService(
      { getTv } as unknown as TmdbService,
      {} as AnilistSearch,
      {
        findTitleSummary,
        upsertEpisode,
        recordWatch,
        upsertListState,
      } as unknown as CatalogService,
      { enqueueTitle } as unknown as EnrichmentService,
    );
  });

  it("accepts titleId without provider ids in the schema", () => {
    const parsed = WatchCatalogLogSchema.safeParse({
      titleId: "t-1",
      type: "show",
      watchedAt: "2026-10-01",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(parsed.success).toBe(true);
    expect(
      WatchCatalogLogSchema.safeParse({ type: "movie", watchedAt: "2026-10-01" })
        .success,
    ).toBe(false);
  });

  it("logs an episode on an existing title without provider lookups", async () => {
    findTitleSummary.mockResolvedValue({
      id: "t-1",
      type: "show",
      runtimeMinutes: 45,
    });
    const result = await service.log("u-1", {
      titleId: "t-1",
      type: "show",
      watchedAt: "2026-10-01",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(getTv).not.toHaveBeenCalled();
    expect(upsertEpisode).toHaveBeenCalledWith({
      titleId: "t-1",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        titleId: "t-1",
        episodeId: "ep-9",
        runtimeMinutes: 24,
        source: "manual",
        dedupeKey: "manual:t-1:show:1:3:2026-10-01",
      }),
    );
    expect(enqueueTitle).toHaveBeenCalledWith("t-1");
    expect(result).toEqual({
      id: "ev-1",
      titleId: "t-1",
      watchedAt: "2026-10-01T12:00:00.000Z",
    });
  });

  it("404s for an unknown title and 400s on a type mismatch", async () => {
    findTitleSummary.mockResolvedValueOnce(null);
    await expect(
      service.log("u-1", {
        titleId: "nope",
        type: "movie",
        watchedAt: "2026-10-01",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    findTitleSummary.mockResolvedValueOnce({
      id: "t-1",
      type: "show",
      runtimeMinutes: null,
    });
    await expect(
      service.log("u-1", {
        titleId: "t-1",
        type: "movie",
        watchedAt: "2026-10-01",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
