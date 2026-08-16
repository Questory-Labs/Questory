import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ManualService } from "../../src/watch/manual/manual.service";
import { TmdbService } from "../../src/watch/tmdb/tmdb.service";
import type { AnilistSearch } from "../../src/watch/manual/anilist-search";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";

describe("ManualService", () => {
  const searchMulti = vi.fn();
  const getMovie = vi.fn();
  const getTv = vi.fn();
  const searchAnime = vi.fn();
  const getMedia = vi.fn();
  const upsertTitle = vi.fn();
  const upsertEpisode = vi.fn();
  const recordWatch = vi.fn();
  const linkGenres = vi.fn();
  const upsertListState = vi.fn();
  const enqueueTitle = vi.fn();
  let service: ManualService;

  beforeEach(() => {
    searchMulti.mockReset();
    getMovie.mockReset();
    getTv.mockReset();
    searchAnime.mockReset();
    getMedia.mockReset();
    upsertTitle.mockReset();
    upsertEpisode.mockReset();
    recordWatch.mockReset();
    linkGenres.mockReset();
    upsertListState.mockReset();
    enqueueTitle.mockReset();

    const tmdb = new TmdbService();
    vi.spyOn(tmdb, "searchMulti").mockImplementation(searchMulti);
    vi.spyOn(tmdb, "getMovie").mockImplementation(getMovie);
    vi.spyOn(tmdb, "getTv").mockImplementation(getTv);

    const anilist = {
      searchAnime,
      getMedia,
    } as unknown as AnilistSearch;
    const catalog = {
      upsertTitle,
      upsertEpisode,
      recordWatch,
      linkGenres,
      upsertListState,
    } as unknown as CatalogService;
    const enrichment = { enqueueTitle } as unknown as EnrichmentService;

    upsertTitle.mockResolvedValue({ id: "title-1" });
    upsertEpisode.mockResolvedValue({ id: "ep-1" });
    recordWatch.mockResolvedValue({
      id: "ev-1",
      watchedAt: new Date("2026-08-16T12:00:00.000Z"),
    });
    linkGenres.mockResolvedValue(undefined);
    upsertListState.mockResolvedValue({});

    service = new ManualService(tmdb, anilist, catalog, enrichment);
  });

  it("returns AniList hits when TMDB is down", async () => {
    searchMulti.mockResolvedValue(null);
    searchAnime.mockResolvedValue([
      {
        id: 154587,
        title: { english: "Frieren" },
        format: "TV",
        seasonYear: 2023,
        coverImage: { large: "https://al.test/p.jpg" },
      },
    ]);

    const result = await service.search("frieren");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      anilistId: 154587,
      sources: ["anilist"],
      type: "show",
    });
  });

  it("throws when both providers fail", async () => {
    searchMulti.mockResolvedValue(null);
    searchAnime.mockResolvedValue(null);
    await expect(service.search("heat")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("logs a TMDB movie with rating", async () => {
    getMovie.mockResolvedValue({
      id: 949,
      title: "Heat",
      release_date: "1995-12-15",
      poster_path: "/heat.jpg",
      runtime: 170,
      overview: "Cops and robbers.",
      genres: [{ id: 1, name: "Crime" }],
      imdb_id: "tt0113277",
    });

    await service.log("user-1", {
      tmdbId: 949,
      type: "movie",
      watchedAt: "2026-08-16",
      rating: 4.5,
    });

    expect(upsertEpisode).not.toHaveBeenCalled();
    expect(upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "movie",
        name: "Heat",
        tmdbId: 949,
        imdbId: "tt0113277",
        runtimeMinutes: 170,
      }),
    );
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        source: "manual",
        precision: "day",
        rating: 4.5,
        dedupeKey: "manual:title-1:movie:0:0:2026-08-16",
      }),
    );
    expect(upsertListState).toHaveBeenCalledWith(
      expect.objectContaining({
        listType: "rating",
        source: "manual",
        rating: 4.5,
      }),
    );
    expect(enqueueTitle).toHaveBeenCalledWith("title-1");
  });

  it("logs an AniList-only show with season and episode", async () => {
    getMedia.mockResolvedValue({
      id: 154587,
      idMal: 21,
      title: { english: "Frieren" },
      format: "TV",
      seasonYear: 2023,
      coverImage: { large: "https://al.test/p.jpg" },
      duration: 24,
      genres: ["Adventure"],
    });

    await service.log("user-1", {
      anilistId: 154587,
      type: "show",
      watchedAt: "2026-08-16",
      seasonNumber: 1,
      episodeNumber: 3,
    });

    expect(upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "show",
        anilistId: 154587,
        malId: 21,
      }),
    );
    expect(upsertEpisode).toHaveBeenCalledWith({
      titleId: "title-1",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(recordWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        episodeId: "ep-1",
        dedupeKey: "manual:title-1:show:1:3:2026-08-16",
      }),
    );
    expect(upsertListState).not.toHaveBeenCalled();
  });

  it("upserts both provider ids on a merged log", async () => {
    getMovie.mockResolvedValue(null);
    getTv.mockResolvedValue({
      id: 209867,
      name: "Frieren",
      first_air_date: "2023-09-29",
    });
    getMedia.mockResolvedValue({
      id: 154587,
      title: { english: "Frieren" },
      format: "TV",
      seasonYear: 2023,
    });

    await service.log("user-1", {
      tmdbId: 209867,
      anilistId: 154587,
      type: "show",
      watchedAt: "2026-08-16",
      seasonNumber: 1,
      episodeNumber: 1,
    });

    expect(upsertTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbId: 209867,
        anilistId: 154587,
      }),
    );
  });

  it("rejects an AniList result whose format does not match the log type", async () => {
    getMedia.mockResolvedValue({
      id: 1,
      title: { english: "A Silent Voice" },
      format: "MOVIE",
      seasonYear: 2016,
    });

    await expect(
      service.log("user-1", {
        anilistId: 1,
        type: "show",
        watchedAt: "2026-08-16",
        seasonNumber: 1,
        episodeNumber: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsertTitle).not.toHaveBeenCalled();
  });

  it("rejects linking TMDB and AniList when names and years do not match", async () => {
    getMovie.mockResolvedValue({
      id: 949,
      title: "Heat",
      release_date: "1995-12-15",
    });
    getMedia.mockResolvedValue({
      id: 209270,
      title: { english: "A Silent Voice" },
      format: "MOVIE",
      seasonYear: 2016,
    });

    await expect(
      service.log("user-1", {
        tmdbId: 949,
        anilistId: 209270,
        type: "movie",
        watchedAt: "2026-08-16",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsertTitle).not.toHaveBeenCalled();
  });

  it("uses the canonical title id so AniList-only and merged logs share a dedupe key", async () => {
    getMedia.mockResolvedValue({
      id: 154587,
      title: { english: "Frieren" },
      format: "TV",
      seasonYear: 2023,
    });
    upsertTitle.mockResolvedValue({ id: "canonical-1" });

    await service.log("user-1", {
      anilistId: 154587,
      type: "show",
      watchedAt: "2026-08-16",
      seasonNumber: 1,
      episodeNumber: 1,
    });

    const anilistKey = recordWatch.mock.calls[0][0].dedupeKey as string;

    getTv.mockResolvedValue({
      id: 209867,
      name: "Frieren: Beyond Journey's End",
      first_air_date: "2023-09-29",
    });
    getMedia.mockResolvedValue({
      id: 154587,
      title: { english: "Frieren" },
      format: "TV",
      seasonYear: 2023,
    });

    await service.log("user-1", {
      tmdbId: 209867,
      anilistId: 154587,
      type: "show",
      watchedAt: "2026-08-16",
      seasonNumber: 1,
      episodeNumber: 1,
    });

    expect(anilistKey).toBe("manual:canonical-1:show:1:1:2026-08-16");
    expect(recordWatch.mock.calls[1][0].dedupeKey).toBe(anilistKey);
  });
});
