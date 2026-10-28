import { describe, expect, it, vi } from "vitest";
import {
  ingestTmdbSeasons,
  showStatusFields,
} from "../../src/watch/enrichment/season-ingest";
import { TMDB_SEASON_INGEST_LIMIT } from "../../src/watch/tmdb/tmdb.constants";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { TmdbService } from "../../src/watch/tmdb/tmdb.service";

function posterUrl(p?: string | null) {
  return p ? "img" + p : null;
}

describe("season ingest", () => {
  it("maps show status fields", () => {
    expect(
      showStatusFields({
        id: 1,
        status: "Returning Series",
        last_air_date: "2026-09-30",
        number_of_episodes: 24,
      }),
    ).toEqual({
      status: "Returning Series",
      lastAirDate: new Date("2026-09-30T00:00:00.000Z"),
      totalEpisodes: 24,
    });
    expect(showStatusFields({ id: 1 })).toEqual({
      status: null,
      lastAirDate: null,
      totalEpisodes: null,
    });
  });

  it("upserts seasons and episodes from TMDB", async () => {
    const seasonUpsert = vi.fn().mockResolvedValue({ id: "s-1" });
    const episodeUpsert = vi.fn().mockResolvedValue({});
    const prisma = {
      season: { upsert: seasonUpsert },
      episode: { upsert: episodeUpsert },
    } as unknown as PrismaService;
    const getTvSeason = vi.fn().mockResolvedValue({
      season_number: 1,
      episodes: [
        {
          id: 11,
          episode_number: 1,
          name: "Pilot",
          air_date: "2026-01-01",
          runtime: 50,
        },
        { id: 12, episode_number: 2, name: "Two", air_date: null, runtime: 0 },
      ],
    });
    const tmdb = { getTvSeason, posterUrl } as unknown as TmdbService;

    const result = await ingestTmdbSeasons(
      prisma,
      tmdb,
      "t-1",
      {
        id: 99,
        seasons: [{ season_number: 1, episode_count: 2, name: "Season 1" }],
      },
      0,
    );

    expect(result).toEqual({ seasons: 1, episodes: 2 });
    expect(getTvSeason).toHaveBeenCalledWith(99, 1);
    expect(seasonUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { titleId_seasonNumber: { titleId: "t-1", seasonNumber: 1 } },
        create: expect.objectContaining({ episodeCount: 2, name: "Season 1" }),
      }),
    );
    expect(episodeUpsert.mock.calls[0][0].create).toMatchObject({
      seasonId: "s-1",
      episodeNumber: 1,
      name: "Pilot",
      runtimeMinutes: 50,
      airDate: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(episodeUpsert.mock.calls[1][0].create.runtimeMinutes).toBeNull();
  });

  it("caps the number of seasons fetched", async () => {
    const getTvSeason = vi.fn().mockResolvedValue(null);
    const prisma = {
      season: { upsert: vi.fn().mockResolvedValue({ id: "s" }) },
      episode: { upsert: vi.fn() },
    } as unknown as PrismaService;
    const seasons = Array.from(
      { length: TMDB_SEASON_INGEST_LIMIT + 5 },
      (_, i) => ({ season_number: i + 1 }),
    );
    await ingestTmdbSeasons(
      prisma,
      { getTvSeason, posterUrl } as unknown as TmdbService,
      "t-1",
      { id: 1, seasons },
      0,
    );
    expect(getTvSeason).toHaveBeenCalledTimes(TMDB_SEASON_INGEST_LIMIT);
  });
});
