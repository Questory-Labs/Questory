import { Injectable, Logger } from "@nestjs/common";
import type { MediaTrendingShelf } from "@questorylabs/shared";
import { CacheService } from "../../cache/cache.service";
import { providerFetch } from "../../lib/qhttp-outbound";
import {
  cachedMediaShelf,
  emptyMediaShelf,
  MEDIA_TRENDING_TOP_N,
  rankItems,
} from "../../lib/media-trending-shelf";

const ANILIST_GQL = "https://graphql.anilist.co";
const CACHE_KEY = "trending:read:anilist:v1";

const TRENDING_QUERY = `
  query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: MANGA, sort: TRENDING_DESC) {
        id
        title { romaji english native }
        format
        coverImage { large }
      }
    }
  }
`;

type AnilistMedia = {
  id: number;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  format?: string | null;
  coverImage?: { large?: string | null } | null;
};

@Injectable()
export class ReadTrendingService {
  private readonly logger = new Logger(ReadTrendingService.name);

  constructor(private readonly cache: CacheService) {}

  async anilistNow(): Promise<MediaTrendingShelf> {
    const empty = emptyMediaShelf({
      source: "anilist",
      windowLabel: "Trending now",
      from: null,
      to: null,
    });
    return cachedMediaShelf(this.cache, CACHE_KEY, empty, () =>
      this.fetchTrending(),
    );
  }

  private async fetchTrending(): Promise<MediaTrendingShelf | null> {
    try {
      const res = await providerFetch(
        ANILIST_GQL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: TRENDING_QUERY,
            variables: { perPage: MEDIA_TRENDING_TOP_N },
          }),
        },
        { retries: 1 },
      );
      if (!res.ok) {
        this.logger.warn(`AniList trending → ${res.status}`);
        return null;
      }
      const json = (await res.json()) as {
        data?: { Page?: { media?: Array<AnilistMedia | null> | null } };
        errors?: unknown;
      };
      if (json.errors) {
        this.logger.warn(
          `AniList GraphQL error: ${JSON.stringify(json.errors).slice(0, 200)}`,
        );
        return null;
      }
      const media = (json.data?.Page?.media ?? []).filter(
        (m): m is AnilistMedia => m != null && typeof m.id === "number",
      );
      return {
        items: rankItems(
          media.map((m) => ({
            id: String(m.id),
            name:
              m.title?.english ||
              m.title?.romaji ||
              m.title?.native ||
              `AniList ${m.id}`,
            imageUrl: m.coverImage?.large ?? null,
            subtitle: m.format ?? null,
            href: `https://anilist.co/manga/${m.id}`,
          })),
        ),
        meta: {
          source: "anilist",
          windowLabel: "Trending now",
          from: null,
          to: null,
        },
      };
    } catch (err) {
      this.logger.warn(
        `AniList trending failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
