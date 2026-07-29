import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { signOAuthState, verifyOAuthState } from "@questorylabs/shared/oauth-state";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { UsersService } from "../users/users.service";
import { ReadCatalogService } from "../../read/catalog/catalog.service";
import {
  mapShikimoriListStatus,
  shikimoriAnimeProgress,
  shikimoriMangaProgress,
} from "../../read/shikimori/shikimori-map";
import { providerFetch } from "../lib/provider-fetch";
import { shikimoriUserAgent } from "../lib/provider-user-agent";
import { resolveProviderDate } from "../lib/resolve-date";
import {
  resolveShikimoriClientId,
  resolveShikimoriClientSecret,
  resolveShikimoriRedirectUri,
} from "../lib/runtime-config";

type ShikimoriRate<T> = {
  id: number;
  score: number;
  status: string;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  updated_at: string;
  created_at: string;
  anime?: T;
  manga?: T;
};

type ShikimoriMedia = {
  id: number;
  name: string;
  russian?: string;
  mal_id?: number | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  image?: { original?: string; preview?: string };
  aired_on?: { date?: string } | null;
};

@Injectable()
export class ShikimoriService {
  private readonly logger = new Logger(ShikimoriService.name);
  private readonly api = "https://shikimori.one";
  private readonly syncingUsers = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
    private readonly readCatalog: ReadCatalogService,
  ) {}

  configured() {
    return Boolean(
      resolveShikimoriClientId() && resolveShikimoriClientSecret(),
    );
  }

  authUrl(state?: string) {
    if (!this.configured()) {
      throw new BadRequestException(
        "SHIKIMORI_CLIENT_ID/SECRET not configured",
      );
    }
    const params = new URLSearchParams({
      client_id: resolveShikimoriClientId(),
      redirect_uri: resolveShikimoriRedirectUri(),
      response_type: "code",
      ...(state ? { state } : {}),
    });
    return `${this.api}/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, userId?: string) {
    if (!this.configured()) {
      throw new BadRequestException(
        "SHIKIMORI_CLIENT_ID/SECRET not configured",
      );
    }
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: resolveShikimoriClientId(),
      client_secret: resolveShikimoriClientSecret(),
      code,
      redirect_uri: resolveShikimoriRedirectUri(),
    });
    const res = await providerFetch(`${this.api}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": shikimoriUserAgent(),
      },
      body,
    });
    if (!res.ok) {
      throw new BadRequestException(
        `Shikimori token exchange failed: ${await res.text()}`,
      );
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const expiresAt =
      data.expires_in != null
        ? new Date(Date.now() + data.expires_in * 1000)
        : null;

    const existing = await this.prisma.sourceConnection.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: "shikimori" },
      },
    });

    await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "shikimori" },
      },
      create: {
        userId: user.id,
        provider: "shikimori",
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? undefined,
        expiresAt,
      },
    });

    if (!existing) {
      void this.syncList(user.id).catch((e) =>
        this.logger.error(
          `Shikimori sync failed: ${e instanceof Error ? e.message : e}`,
        ),
      );
    }

    return { ok: true, userId: user.id };
  }

  async getConnection(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "shikimori" } },
    });
    return {
      connected: Boolean(conn),
      userId: user.id,
      syncing: Boolean(conn && this.syncingUsers.has(user.id)),
      lastSyncedAt: conn?.lastSyncedAt?.toISOString() ?? null,
    };
  }

  isSyncing(userId: string) {
    return this.syncingUsers.has(userId);
  }

  async syncList(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "shikimori" } },
    });
    if (!conn) throw new BadRequestException("Shikimori not connected");

    this.syncingUsers.add(user.id);
    try {
      const token = await this.ensureAccessToken(user.id);
      const profile = await this.apiGet<{ id: number }>(
        "/api/users/whoami",
        token,
      );
      const animeAccepted = await this.syncAnimeRates(
        user.id,
        token,
        profile.id,
      );
      const mangaAccepted = await this.syncMangaRates(
        user.id,
        token,
        profile.id,
      );
      await this.prisma.sourceConnection.update({
        where: { id: conn.id },
        data: {
          lastSyncedAt: new Date(),
          externalUserId: String(profile.id),
        },
      });
      return {
        ok: true,
        accepted: animeAccepted,
        mangaAccepted,
        userId: user.id,
      };
    } finally {
      this.syncingUsers.delete(user.id);
    }
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      "User-Agent": shikimoriUserAgent(),
    };
  }

  private async apiGet<T>(path: string, token: string): Promise<T> {
    const res = await providerFetch(`${this.api}${path}`, {
      headers: this.headers(token),
    });
    if (!res.ok) {
      throw new Error(
        `Shikimori GET ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`,
      );
    }
    return res.json() as Promise<T>;
  }

  private async ensureAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: "shikimori" } },
    });
    if (!conn) throw new BadRequestException("Shikimori not connected");

    const expired =
      conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expired) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: resolveShikimoriClientId(),
      client_secret: resolveShikimoriClientSecret(),
      refresh_token: conn.refreshToken,
    });
    const res = await providerFetch(`${this.api}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": shikimoriUserAgent(),
      },
      body,
    });
    if (!res.ok) {
      this.logger.warn(`Shikimori refresh failed: ${res.status}`);
      return conn.accessToken;
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const expiresAt =
      data.expires_in != null
        ? new Date(Date.now() + data.expires_in * 1000)
        : null;
    await this.prisma.sourceConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? conn.refreshToken,
        expiresAt,
      },
    });
    return data.access_token;
  }

  private async syncAnimeRates(
    userId: string,
    token: string,
    shikimoriUserId: number,
  ) {
    let page = 1;
    let accepted = 0;

    while (true) {
      const rates = await this.apiGet<ShikimoriRate<ShikimoriMedia>[]>(
        `/api/users/${shikimoriUserId}/anime_rates?limit=50&page=${page}`,
        token,
      );
      if (!rates.length) break;

      for (const rate of rates) {
        const media = rate.anime;
        if (!media) continue;
        const name = media.russian || media.name;
        const year = media.aired_on?.date
          ? Number.parseInt(media.aired_on.date.slice(0, 4), 10)
          : null;
        const episodesWatched = rate.episodes ?? 0;

        const title = await this.catalog.upsertTitle({
          type: "show",
          name,
          year: Number.isFinite(year) ? year : null,
          shikimoriId: media.id,
          malId: media.mal_id ?? null,
          posterUrl: media.image?.original
            ? `${this.api}${media.image.original}`
            : null,
        });

        const watchedAt = resolveProviderDate({ updatedAt: rate.updated_at });
        const dedupeKey = `shikimori:list:${rate.id}:${rate.status}:${episodesWatched}`;

        if (
          rate.status === "completed" ||
          rate.status === "watching" ||
          episodesWatched > 0
        ) {
          await this.catalog.recordWatch({
            userId,
            titleId: title.id,
            watchedAt,
            source: "shikimori",
            dedupeKey,
            action: "import",
            progress: shikimoriAnimeProgress(
              episodesWatched,
              media.episodes,
              rate.status,
            ),
            rating: rate.score || null,
            precision: "unknown",
          });
          accepted += 1;
        }

        if (rate.score) {
          await this.catalog.upsertListState({
            userId,
            titleId: title.id,
            listType: "rating",
            source: "shikimori",
            rating: rate.score,
            listedAt: watchedAt,
          });
        }

        this.enrichment.enqueueTitle(title.id);
      }

      if (rates.length < 50) break;
      page += 1;
    }

    return accepted;
  }

  private async syncMangaRates(
    userId: string,
    token: string,
    shikimoriUserId: number,
  ) {
    let page = 1;
    let accepted = 0;

    while (true) {
      const rates = await this.apiGet<ShikimoriRate<ShikimoriMedia>[]>(
        `/api/users/${shikimoriUserId}/manga_rates?limit=50&page=${page}`,
        token,
      );
      if (!rates.length) break;

      for (const rate of rates) {
        const media = rate.manga;
        if (!media) continue;
        const name = media.russian || media.name;
        const year = media.aired_on?.date
          ? Number.parseInt(media.aired_on.date.slice(0, 4), 10)
          : null;
        const chaptersRead = rate.chapters ?? 0;
        const volumesRead = rate.volumes ?? 0;
        const listStatus = mapShikimoriListStatus(rate.status);
        const readAt = resolveProviderDate({ updatedAt: rate.updated_at });

        const title = await this.readCatalog.upsertTitle({
          format: "manga",
          name,
          year: Number.isFinite(year) ? year : null,
          chapters: media.chapters ?? null,
          volumes: media.volumes ?? null,
          shikimoriId: media.id,
          malId: media.mal_id ?? null,
          coverUrl: media.image?.original
            ? `${this.api}${media.image.original}`
            : null,
        });

        await this.readCatalog.upsertListState({
          userId,
          readTitleId: title.id,
          listStatus,
          source: "shikimori",
          score: rate.score || null,
          progressChapters: chaptersRead,
          progressVolumes: volumesRead,
          listedAt: readAt,
        });

        if (rate.status === "planned") {
          accepted += 1;
          continue;
        }

        if (
          rate.status === "completed" ||
          rate.status === "reading" ||
          chaptersRead > 0 ||
          volumesRead > 0
        ) {
          const dedupeKey = `shikimori:manga:${rate.id}:${rate.status}:${chaptersRead}:${volumesRead}`;
          await this.readCatalog.recordProgress({
            userId,
            readTitleId: title.id,
            readAt,
            source: "shikimori",
            dedupeKey,
            action: "import",
            status: rate.status,
            chaptersRead: chaptersRead || null,
            volumesRead: volumesRead || null,
            progress: shikimoriMangaProgress(
              chaptersRead,
              media.chapters,
              rate.status,
            ),
            rating: rate.score || null,
            precision: "unknown",
            chaptersDelta: chaptersRead,
          });
          accepted += 1;
        }
      }

      if (rates.length < 50) break;
      page += 1;
    }

    return accepted;
  }
}
