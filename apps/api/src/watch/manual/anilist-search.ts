import { Injectable, Logger } from "@nestjs/common";
import { providerFetch } from "../../lib/qhttp-outbound";

const ANILIST_GQL = "https://graphql.anilist.co";

export type AnilistMediaHit = {
  id: number;
  idMal?: number | null;
  title: { romaji?: string | null; english?: string | null; native?: string | null };
  format?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null } | null;
  coverImage?: { large?: string | null } | null;
  duration?: number | null;
  genres?: string[] | null;
  description?: string | null;
};

function mediaName(media: AnilistMediaHit): string {
  return (
    media.title.english ||
    media.title.romaji ||
    media.title.native ||
    `AniList ${media.id}`
  );
}

function mediaYear(media: AnilistMediaHit): number | null {
  return media.seasonYear ?? media.startDate?.year ?? null;
}

export function anilistFormatToType(
  format: string | null | undefined,
): "movie" | "show" {
  return format === "MOVIE" ? "movie" : "show";
}

export function anilistDisplayName(media: AnilistMediaHit): string {
  return mediaName(media);
}

export function anilistYear(media: AnilistMediaHit): number | null {
  return mediaYear(media);
}

@Injectable()
export class AnilistSearch {
  private readonly logger = new Logger(AnilistSearch.name);

  async searchAnime(
    query: string,
    limit: number,
  ): Promise<AnilistMediaHit[] | null> {
    const json = await this.gql<{
      Page?: { media?: Array<AnilistMediaHit | null> | null };
    }>(
      `query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            idMal
            title { romaji english native }
            format
            seasonYear
            startDate { year }
            coverImage { large }
            duration
            genres
          }
        }
      }`,
      { search: query, perPage: limit },
    );
    if (json == null) return null;
    return (json.Page?.media ?? []).filter(
      (m): m is AnilistMediaHit => m != null && typeof m.id === "number",
    );
  }

  async getMedia(id: number): Promise<AnilistMediaHit | null> {
    const json = await this.gql<{ Media?: AnilistMediaHit | null }>(
      `query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title { romaji english native }
          format
          seasonYear
          startDate { year }
          coverImage { large }
          duration
          genres
          description
        }
      }`,
      { id },
    );
    return json?.Media ?? null;
  }

  private async gql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T | null> {
    try {
      const res = await providerFetch(
        ANILIST_GQL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ query, variables }),
        },
        { retries: 1 },
      );
      if (!res.ok) {
        this.logger.warn(`AniList search → ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { data?: T; errors?: unknown };
      if (json.errors) {
        this.logger.warn(
          `AniList GraphQL error: ${JSON.stringify(json.errors).slice(0, 200)}`,
        );
        return null;
      }
      return json.data ?? null;
    } catch (err) {
      this.logger.warn(
        `AniList search failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
