import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { UsersService } from "../users/users.service";
import { ReadCatalogService } from "../../read/catalog/catalog.service";
import {
  mapMalListStatus,
  mapMalMangaFormat,
  malAnimeProgressPercent,
  malMangaProgressPercent,
} from "../../read/mal/mal-map";
import { providerFetch } from "../lib/provider-fetch";
import { resolveProviderDate } from "../lib/resolve-date";
import {
  resolveMalClientId,
  resolveMalClientSecret,
  resolveMalRedirectUri,
} from "../lib/runtime-config";
import {
  generateMalPkce,
  signMalOAuthState,
  verifyMalOAuthState,
} from "./mal-auth";

type MalListEntry<T> = {
  node: T;
  list_status?: {
    status?: string;
    score?: number;
    num_episodes_watched?: number;
    num_chapters_read?: number;
    num_volumes_read?: number;
    updated_at?: string;
    finish_date?: string;
  };
};

type MalAnimeNode = {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  start_date?: string;
  num_episodes?: number;
};

type MalMangaNode = {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  start_date?: string;
  num_chapters?: number;
  num_volumes?: number;
};

@Injectable()
export class MalService {
  private readonly logger = new Logger(MalService.name);
  private readonly api = "https://api.myanimelist.net/v2";
  private readonly syncingUsers = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
    private readonly readCatalog: ReadCatalogService,
  ) {}

  configured() {
    return Boolean(resolveMalClientId() && resolveMalClientSecret());
  }

  authUrl(state: string) {
    if (!this.configured()) {
      throw new BadRequestException("MAL_CLIENT_ID/SECRET not configured");
    }
    const { codeChallenge } = generateMalPkce();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: resolveMalClientId(),
      redirect_uri: resolveMalRedirectUri(),
      code_challenge: codeChallenge,
      code_challenge_method: "plain",
      state,
    });
    return `https://myanimelist.net/v1/oauth2/authorize?${params}`;
  }

  buildAuthState(userId: string) {
    const { codeVerifier, codeChallenge } = generateMalPkce();
    const state = signMalOAuthState(userId, codeVerifier);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: resolveMalClientId(),
      redirect_uri: resolveMalRedirectUri(),
      code_challenge: codeChallenge,
      code_challenge_method: "plain",
      state,
    });
    return {
      state,
      url: `https://myanimelist.net/v1/oauth2/authorize?${params}`,
    };
  }

  async exchangeCode(code: string, state: string | undefined, userId?: string) {
    if (!this.configured()) {
      throw new BadRequestException("MAL_CLIENT_ID/SECRET not configured");
    }
    const verified = verifyMalOAuthState(state);
    if (!verified) {
      throw new BadRequestException("Invalid or expired OAuth state");
    }
    if (userId && verified.userId !== userId) {
      throw new BadRequestException("OAuth state user mismatch");
    }

    const body = new URLSearchParams({
      client_id: resolveMalClientId(),
      client_secret: resolveMalClientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: resolveMalRedirectUri(),
      code_verifier: verified.codeVerifier,
    });

    const res = await providerFetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new BadRequestException(
        `MAL token exchange failed: ${await res.text()}`,
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
        userId_provider: { userId: verified.userId, provider: "mal" },
      },
    });

    await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: verified.userId, provider: "mal" },
      },
      create: {
        userId: verified.userId,
        provider: "mal",
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
      void this.syncList(verified.userId).catch((e) =>
        this.logger.error(
          `MAL sync failed: ${e instanceof Error ? e.message : e}`,
        ),
      );
    }

    return { ok: true, userId: verified.userId };
  }

  async getConnection(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "mal" } },
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
      where: { userId_provider: { userId: user.id, provider: "mal" } },
    });
    if (!conn) throw new BadRequestException("MAL not connected");

    this.syncingUsers.add(user.id);
    try {
      const token = await this.ensureAccessToken(user.id);
      const animeAccepted = await this.syncAnimeList(user.id, token);
      const mangaAccepted = await this.syncMangaList(user.id, token);
      await this.prisma.sourceConnection.update({
        where: { id: conn.id },
        data: { lastSyncedAt: new Date() },
      });
      return { ok: true, accepted: animeAccepted, mangaAccepted, userId: user.id };
    } finally {
      this.syncingUsers.delete(user.id);
    }
  }

  private async ensureAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: "mal" } },
    });
    if (!conn) throw new BadRequestException("MAL not connected");

    const expired =
      conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expired) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;

    const body = new URLSearchParams({
      client_id: resolveMalClientId(),
      client_secret: resolveMalClientSecret(),
      grant_type: "refresh_token",
      refresh_token: conn.refreshToken,
    });
    const res = await providerFetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      this.logger.warn(`MAL refresh failed: ${res.status}`);
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

  private async malGet<T>(path: string, token: string): Promise<T> {
    const res = await providerFetch(`${this.api}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`MAL GET ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  private async syncAnimeList(userId: string, token: string) {
    let offset = 0;
    let accepted = 0;
    const fields =
      "list_status{status,score,num_episodes_watched,updated_at,finish_date},num_episodes,main_picture,start_date";

    while (true) {
      const json = await this.malGet<{
        data?: MalListEntry<MalAnimeNode>[];
        paging?: { next?: string };
      }>(
        `/users/@me/animelist?limit=100&offset=${offset}&fields=${encodeURIComponent(fields)}&nsfw=true`,
        token,
      );
      const entries = json.data ?? [];
      if (!entries.length) break;

      for (const entry of entries) {
        const media = entry.node;
        const status = entry.list_status?.status ?? "plan_to_watch";
        const progress = entry.list_status?.num_episodes_watched ?? 0;
        const score = entry.list_status?.score ?? 0;
        const year = media.start_date
          ? Number.parseInt(media.start_date.slice(0, 4), 10)
          : null;

        const title = await this.catalog.upsertTitle({
          type: "show",
          name: media.title,
          year: Number.isFinite(year) ? year : null,
          malId: media.id,
          posterUrl:
            media.main_picture?.large || media.main_picture?.medium || null,
          runtimeMinutes: null,
        });

        const watchedAt = resolveProviderDate({
          updatedAt: entry.list_status?.updated_at,
          finishedAt: entry.list_status?.finish_date,
        });
        const dedupeKey = `mal:list:${media.id}:${status}:${progress}`;

        if (
          status === "completed" ||
          status === "watching" ||
          progress > 0
        ) {
          await this.catalog.recordWatch({
            userId,
            titleId: title.id,
            watchedAt,
            source: "mal",
            dedupeKey,
            action: "import",
            progress: malAnimeProgressPercent(
              progress,
              media.num_episodes,
              status,
            ),
            rating: score || null,
            precision: entry.list_status?.finish_date ? "day" : "unknown",
          });
          accepted += 1;
        }

        if (score) {
          await this.catalog.upsertListState({
            userId,
            titleId: title.id,
            listType: "rating",
            source: "mal",
            rating: score,
            listedAt: watchedAt,
          });
        }

        this.enrichment.enqueueTitle(title.id);
      }

      if (!json.paging?.next) break;
      offset += 100;
    }

    return accepted;
  }

  private async syncMangaList(userId: string, token: string) {
    let offset = 0;
    let accepted = 0;
    const fields =
      "list_status{status,score,num_chapters_read,num_volumes_read,updated_at,finish_date},num_chapters,num_volumes,main_picture,start_date";

    while (true) {
      const json = await this.malGet<{
        data?: MalListEntry<MalMangaNode>[];
        paging?: { next?: string };
      }>(
        `/users/@me/mangalist?limit=100&offset=${offset}&fields=${encodeURIComponent(fields)}&nsfw=true`,
        token,
      );
      const entries = json.data ?? [];
      if (!entries.length) break;

      for (const entry of entries) {
        const media = entry.node;
        const status = entry.list_status?.status ?? "plan_to_read";
        const chaptersRead = entry.list_status?.num_chapters_read ?? 0;
        const volumesRead = entry.list_status?.num_volumes_read ?? 0;
        const score = entry.list_status?.score ?? 0;
        const year = media.start_date
          ? Number.parseInt(media.start_date.slice(0, 4), 10)
          : null;
        const listStatus = mapMalListStatus(status);
        const readAt = resolveProviderDate({
          updatedAt: entry.list_status?.updated_at,
          finishedAt: entry.list_status?.finish_date,
        });

        const title = await this.readCatalog.upsertTitle({
          format: mapMalMangaFormat(),
          name: media.title,
          year: Number.isFinite(year) ? year : null,
          chapters: media.num_chapters ?? null,
          volumes: media.num_volumes ?? null,
          coverUrl:
            media.main_picture?.large || media.main_picture?.medium || null,
          malId: media.id,
        });

        await this.readCatalog.upsertListState({
          userId,
          readTitleId: title.id,
          listStatus,
          source: "mal",
          score: score || null,
          progressChapters: chaptersRead,
          progressVolumes: volumesRead,
          listedAt: readAt,
        });

        if (status === "plan_to_read") {
          accepted += 1;
          continue;
        }

        if (
          status === "completed" ||
          status === "reading" ||
          chaptersRead > 0 ||
          volumesRead > 0
        ) {
          const dedupeKey = `mal:manga:${media.id}:${status}:${chaptersRead}:${volumesRead}`;
          await this.readCatalog.recordProgress({
            userId,
            readTitleId: title.id,
            readAt,
            source: "mal",
            dedupeKey,
            action: "import",
            status,
            chaptersRead: chaptersRead || null,
            volumesRead: volumesRead || null,
            progress: malMangaProgressPercent(
              chaptersRead,
              media.num_chapters,
              status,
            ),
            rating: score || null,
            precision: entry.list_status?.finish_date ? "day" : "unknown",
            chaptersDelta: chaptersRead,
          });
          accepted += 1;
        }
      }

      if (!json.paging?.next) break;
      offset += 100;
    }

    return accepted;
  }
}
