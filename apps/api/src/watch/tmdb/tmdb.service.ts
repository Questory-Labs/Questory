import { Injectable, Logger } from "@nestjs/common";
import { providerFetch } from "../../lib/qhttp-outbound";
import { resolveTmdbApiKey } from "../lib/runtime-config";

export type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  runtime?: number;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  original_language?: string;
  origin_country?: string[];
  media_type?: string;
  genres?: { id: number; name: string }[];
  imdb_id?: string;
  episode_run_time?: number[];
};

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly base = "https://api.themoviedb.org/3";

  configured() {
    return Boolean(resolveTmdbApiKey());
  }

  private headers() {
    const key = resolveTmdbApiKey();
    return {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
    };
  }

  /** Support both v4 bearer and legacy api_key query. */
  private async get<T>(path: string, query: Record<string, string> = {}): Promise<T | null> {
    const key = resolveTmdbApiKey();
    if (!key) return null;

    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

    const useBearer = key.length > 40;
    if (!useBearer) url.searchParams.set("api_key", key);

    try {
      const res = await providerFetch(url, {
        headers: useBearer
          ? this.headers()
          : { Accept: "application/json" },
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 180);
        this.logger.warn(
          `TMDB ${path} → ${res.status}${detail ? `: ${detail}` : ""}`,
        );
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      this.logger.warn(
        `TMDB ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async getMovie(tmdbId: number) {
    return this.get<TmdbMovie>(`/movie/${tmdbId}`);
  }

  async getTv(tmdbId: number) {
    return this.get<TmdbMovie>(`/tv/${tmdbId}`);
  }

  async searchMovie(name: string, year?: number | null) {
    const data = await this.get<{ results: TmdbMovie[] }>("/search/movie", {
      query: name,
      ...(year ? { year: String(year) } : {}),
    });
    return data?.results?.[0] ?? null;
  }

  async searchTv(name: string, year?: number | null) {
    const data = await this.get<{ results: TmdbMovie[] }>("/search/tv", {
      query: name,
      ...(year ? { first_air_date_year: String(year) } : {}),
    });
    return data?.results?.[0] ?? null;
  }

  async searchMulti(query: string, limit: number): Promise<TmdbMovie[] | null> {
    if (!this.configured()) return [];
    const data = await this.get<{ results: TmdbMovie[] }>("/search/multi", {
      query,
    });
    if (data == null) return null;
    return (data.results ?? [])
      .filter((hit) => hit.media_type === "movie" || hit.media_type === "tv")
      .slice(0, limit);
  }

  /** Search hits omit runtime; resolve a full detail payload when needed. */
  async resolveMovieDetail(hit: TmdbMovie | null) {
    if (!hit?.id) return null;
    if (hit.runtime != null && hit.runtime > 0) return hit;
    return (await this.getMovie(hit.id)) ?? hit;
  }

  async resolveTvDetail(hit: TmdbMovie | null) {
    if (!hit?.id) return null;
    if (
      (hit.runtime != null && hit.runtime > 0) ||
      (hit.episode_run_time && hit.episode_run_time.length > 0)
    ) {
      return hit;
    }
    return (await this.getTv(hit.id)) ?? hit;
  }

  /** Movie `runtime`, or typical TV episode length from `episode_run_time`. */
  runtimeMinutes(detail: TmdbMovie | null | undefined): number | null {
    if (!detail) return null;
    if (detail.runtime != null && detail.runtime > 0) return detail.runtime;
    const episode = detail.episode_run_time?.find((n) => n != null && n > 0);
    return episode ?? null;
  }

  posterUrl(path?: string | null) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `https://image.tmdb.org/t/p/w500${path}`;
  }

  yearFromDate(d?: string | null) {
    if (!d) return null;
    const y = Number(d.slice(0, 4));
    return Number.isFinite(y) ? y : null;
  }
}
