import { Injectable, Logger } from "@nestjs/common";
import type { MediaTrendingShelf } from "@questorylabs/shared";
import { CacheService } from "../../cache/cache.service";
import {
  cachedMediaShelf,
  emptyMediaShelf,
  rankItems,
} from "../../lib/media-trending-shelf";
import { TmdbService } from "../tmdb/tmdb.service";

const CACHE_KEY = "trending:watch:tmdb:v1";

@Injectable()
export class WatchTrendingService {
  private readonly logger = new Logger(WatchTrendingService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly tmdb: TmdbService,
  ) {}

  async tmdbWeek(): Promise<MediaTrendingShelf> {
    const empty = emptyMediaShelf({
      source: "tmdb",
      windowLabel: "Last 7 days (TMDB half-life)",
      from: null,
      to: null,
    });
    return cachedMediaShelf(this.cache, CACHE_KEY, empty, () => this.fetchWeek());
  }

  private async fetchWeek(): Promise<MediaTrendingShelf | null> {
    const hits = await this.tmdb.trendingWeek();
    if (hits == null) {
      this.logger.warn("TMDB trending/week failed");
      return null;
    }
    const items = rankItems(
      hits.map((hit) => {
        const kind = hit.media_type === "tv" ? "tv" : "movie";
        const name = hit.title || hit.name || `TMDB ${hit.id}`;
        return {
          id: String(hit.id),
          name,
          imageUrl: this.tmdb.posterUrl(hit.poster_path),
          subtitle: kind,
          href: `https://www.themoviedb.org/${kind}/${hit.id}`,
        };
      }),
    );
    return {
      items,
      meta: {
        source: "tmdb",
        windowLabel: "Last 7 days (TMDB half-life)",
        from: null,
        to: null,
      },
    };
  }
}
