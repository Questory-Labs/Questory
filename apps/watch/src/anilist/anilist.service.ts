import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { UsersService } from "../users/users.service";
import {
  resolveAniListClientId,
  resolveAniListClientSecret,
  resolveAniListRedirectUri,
} from "../lib/runtime-config";

@Injectable()
export class AnilistService {
  private readonly logger = new Logger(AnilistService.name);
  private readonly gql = "https://graphql.anilist.co";

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
  ) {}

  configured() {
    return Boolean(resolveAniListClientId() && resolveAniListClientSecret());
  }

  authUrl(state?: string) {
    if (!this.configured()) {
      throw new BadRequestException("ANILIST_CLIENT_ID/SECRET not configured");
    }
    const params = new URLSearchParams({
      client_id: resolveAniListClientId(),
      redirect_uri: resolveAniListRedirectUri(),
      response_type: "code",
      ...(state ? { state } : {}),
    });
    return `https://anilist.co/api/v2/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, userId?: string) {
    if (!this.configured()) {
      throw new BadRequestException("ANILIST_CLIENT_ID/SECRET not configured");
    }
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");

    const res = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: resolveAniListClientId(),
        client_secret: resolveAniListClientSecret(),
        redirect_uri: resolveAniListRedirectUri(),
        code,
      }),
    });
    if (!res.ok) {
      throw new BadRequestException(
        `AniList token exchange failed: ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { access_token: string };

    await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "anilist" },
      },
      create: {
        userId: user.id,
        provider: "anilist",
        accessToken: data.access_token,
      },
      update: { accessToken: data.access_token },
    });

    void this.syncList(user.id).catch((e) =>
      this.logger.error(
        `AniList sync failed: ${e instanceof Error ? e.message : e}`,
      ),
    );

    return { ok: true, userId: user.id };
  }

  async getConnection(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "anilist" } },
    });
    return {
      connected: Boolean(conn),
      userId: user.id,
      lastSyncedAt: conn?.lastSyncedAt?.toISOString() ?? null,
    };
  }

  async syncList(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "anilist" } },
    });
    if (!conn) throw new BadRequestException("AniList not connected");

    const query = `
      query {
        Viewer { id name }
        MediaListCollection(type: ANIME, userId: 0, status_not: PLANNING) {
          lists {
            entries {
              id status score progress
              updatedAt completedAt startedAt
              media {
                id idMal
                title { romaji english native }
                seasonYear episodes duration
                genres
                type format
              }
            }
          }
        }
      }
    `;

    // First get Viewer id
    const viewerRes = await fetch(this.gql, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: `{ Viewer { id name } }`,
      }),
    });
    const viewerJson = (await viewerRes.json()) as {
      data?: { Viewer?: { id: number; name: string } };
    };
    const viewerId = viewerJson.data?.Viewer?.id;
    if (!viewerId) throw new BadRequestException("AniList Viewer missing");

    const listRes = await fetch(this.gql, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: query.replace("userId: 0", `userId: ${viewerId}`),
      }),
    });
    const listJson = (await listRes.json()) as {
      data?: {
        MediaListCollection?: {
          lists: {
            entries: {
              id: number;
              status: string;
              score: number;
              progress: number;
              updatedAt?: number;
              completedAt?: { year?: number; month?: number; day?: number };
              media: {
                id: number;
                idMal?: number;
                title: { romaji?: string; english?: string; native?: string };
                seasonYear?: number;
                episodes?: number;
                duration?: number;
                genres?: string[];
                format?: string;
              };
            }[];
          }[];
        };
      };
      errors?: unknown;
    };

    if (listJson.errors) {
      throw new BadRequestException(
        `AniList GraphQL error: ${JSON.stringify(listJson.errors).slice(0, 300)}`,
      );
    }

    let accepted = 0;
    const lists = listJson.data?.MediaListCollection?.lists || [];
    for (const list of lists) {
      for (const entry of list.entries) {
        const media = entry.media;
        const name =
          media.title.english ||
          media.title.romaji ||
          media.title.native ||
          `AniList ${media.id}`;
        const isMovie = media.format === "MOVIE";
        const title = await this.catalog.upsertTitle({
          type: isMovie ? "movie" : "show",
          name,
          year: media.seasonYear ?? null,
          anilistId: media.id,
          malId: media.idMal ?? null,
          runtimeMinutes: media.duration ?? null,
        });
        if (media.genres?.length) {
          await this.catalog.linkGenres(title.id, media.genres, "anilist");
        }

        const watchedAt = this.resolveDate(entry);
        const precision = entry.completedAt?.year ? "day" : "unknown";
        const dedupeKey = `anilist:list:${entry.id}:${entry.status}:${entry.progress}`;

        if (
          entry.status === "COMPLETED" ||
          entry.status === "CURRENT" ||
          entry.progress > 0
        ) {
          await this.catalog.recordWatch({
            userId: user.id,
            titleId: title.id,
            watchedAt,
            source: "anilist",
            dedupeKey,
            action: "import",
            progress:
              media.episodes && media.episodes > 0
                ? Math.min(
                    100,
                    Math.round((entry.progress / media.episodes) * 100),
                  )
                : entry.status === "COMPLETED"
                  ? 100
                  : 50,
            rating: entry.score || null,
            precision,
            runtimeMinutes: media.duration ?? null,
          });
          accepted += 1;
        }

        if (entry.score) {
          await this.catalog.upsertListState({
            userId: user.id,
            titleId: title.id,
            listType: "rating",
            source: "anilist",
            rating: entry.score,
            listedAt: watchedAt,
          });
        }

        this.enrichment.enqueueTitle(title.id);
      }
    }

    await this.prisma.sourceConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncedAt: new Date(),
        externalUserId: String(viewerId),
      },
    });

    return { ok: true, accepted, userId: user.id };
  }

  private resolveDate(entry: {
    updatedAt?: number;
    completedAt?: { year?: number; month?: number; day?: number };
  }) {
    const c = entry.completedAt;
    if (c?.year) {
      const m = c.month ?? 1;
      const d = c.day ?? 1;
      return new Date(Date.UTC(c.year, m - 1, d, 12, 0, 0));
    }
    if (entry.updatedAt) return new Date(entry.updatedAt * 1000);
    return new Date();
  }
}
