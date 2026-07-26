import { describe, expect, it, vi } from "vitest";
import { TmdbService } from "../../src/watch/tmdb/tmdb.service";

describe("TmdbService runtime helpers", () => {
  it("resolveMovieDetail fetches full movie when search hit lacks runtime", async () => {
    const tmdb = new TmdbService();
    const getMovie = vi
      .spyOn(tmdb, "getMovie")
      .mockResolvedValue({ id: 42, title: "Heat", runtime: 170 });

    const detail = await tmdb.resolveMovieDetail({ id: 42, title: "Heat" });

    expect(getMovie).toHaveBeenCalledWith(42);
    expect(detail?.runtime).toBe(170);
    expect(tmdb.runtimeMinutes(detail)).toBe(170);
  });

  it("runtimeMinutes falls back to TV episode_run_time", () => {
    const tmdb = new TmdbService();
    expect(
      tmdb.runtimeMinutes({ id: 1, episode_run_time: [0, 45, 42] }),
    ).toBe(45);
    expect(tmdb.runtimeMinutes({ id: 1, runtime: 0 })).toBeNull();
  });
});
