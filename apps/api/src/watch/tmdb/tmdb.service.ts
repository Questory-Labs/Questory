import { Injectable, Logger } from "@nestjs/common";
import { resolveTmdbApiKey } from "../lib/runtime-config";

type TmdbMovie = {
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
  genres?: { id: number; name: string }[];
  imdb_id?: string;
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
      const res = await fetch(url, {
        headers: useBearer
          ? this.headers()
          : { Accept: "application/json" },
      });
      if (!res.ok) {
        this.logger.warn(`TMDB ${path} → ${res.status}`);
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
