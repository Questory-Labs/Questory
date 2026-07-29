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
  bangumiAnimeProgress,
  bangumiMangaProgress,
  mapBangumiCollectionType,
} from "../../read/bangumi/bangumi-map";
import { providerFetch } from "../lib/provider-fetch";
import { questoryUserAgent } from "../lib/provider-user-agent";
import { resolveProviderDate } from "../lib/resolve-date";
import {
  resolveBangumiClientId,
  resolveBangumiClientSecret,
  resolveBangumiRedirectUri,
} from "../lib/runtime-config";

type BangumiCollection = {
  id: number;
  type: string;
  rate?: number;
  ep_status?: number;
  vol_status?: number;
  updated_at?: string;
  subject?: {
    id: number;
    name: string;
    name_cn?: string;
    date?: string;
    eps?: number;
    volumes?: number;
    images?: { common?: string; medium?: string; large?: string };
  };
};

@Injectable()
export class BangumiService {
  private readonly logger = new Logger(BangumiService.name);
  private readonly api = "https://api.bgm.tv/v0";
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
      resolveBangumiClientId() && resolveBangumiClientSecret(),
    );
  }

  authUrl(state?: string) {
    if (!this.configured()) {
      throw new BadRequestException(
        "BANGUMI_CLIENT_ID/SECRET not configured",
      );
    }
    const params = new URLSearchParams({
      client_id: resolveBangumiClientId(),
      response_type: "code",
      redirect_uri: resolveBangumiRedirectUri(),
      ...(state ? { state } : {}),
    });
    return `https://bgm.tv/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, userId?: string) {
    if (!this.configured()) {
      throw new BadRequestException(
        "BANGUMI_CLIENT_ID/SECRET not configured",
      );
    }
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: resolveBangumiClientId(),
      client_secret: resolveBangumiClientSecret(),
      code,
      redirect_uri: resolveBangumiRedirectUri(),
    });
    const res = await providerFetch("https://bgm.tv/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": questoryUserAgent(),
      },
      body,
    });
    if (!res.ok) {
      throw new BadRequestException(
        `Bangumi token exchange failed: ${await res.text()}`,
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
        userId_provider: { userId: user.id, provider: "bangumi" },
      },
    });

    await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "bangumi" },
      },
      create: {
        userId: user.id,
        provider: "bangumi",
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
          `Bangumi sync failed: ${e instanceof Error ? e.message : e}`,
        ),
      );
    }

    return { ok: true, userId: user.id };
  }

  async getConnection(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "bangumi" } },
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
      where: { userId_provider: { userId: user.id, provider: "bangumi" } },
    });
    if (!conn) throw new BadRequestException("Bangumi not connected");

    this.syncingUsers.add(user.id);
    try {
      const token = await this.ensureAccessToken(user.id);
      const animeAccepted = await this.syncCollections(user.id, token, 2);
      const mangaAccepted = await this.syncCollections(user.id, token, 1);
      await this.prisma.sourceConnection.update({
        where: { id: conn.id },
        data: { lastSyncedAt: new Date() },
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
      "User-Agent": questoryUserAgent(),
    };
  }

  private async ensureAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: "bangumi" } },
    });
    if (!conn) throw new BadRequestException("Bangumi not connected");

    const expired =
      conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expired) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: resolveBangumiClientId(),
      client_secret: resolveBangumiClientSecret(),
      refresh_token: conn.refreshToken,
    });
    const res = await providerFetch("https://bgm.tv/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": questoryUserAgent(),
      },
      body,
    });
    if (!res.ok) {
      this.logger.warn(`Bangumi refresh failed: ${res.status}`);
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

  private async syncCollections(
    userId: string,
    token: string,
    subjectType: number,
  ): Promise<number> {
    let offset = 0;
    let accepted = 0;
    const isAnime = subjectType === 2;

    while (true) {
      const res = await providerFetch(
        `${this.api}/users/-/collections?subject_type=${subjectType}&limit=100&offset=${offset}`,
        { headers: this.headers(token) },
      );
      if (!res.ok) {
        throw new Error(
          `Bangumi collections: ${res.status} ${(await res.text()).slice(0, 200)}`,
        );
      }
      const json = (await res.json()) as {
        data?: BangumiCollection[];
        total?: number;
      };
      const entries = json.data ?? [];
      if (!entries.length) break;

      for (const entry of entries) {
        const subject = entry.subject;
        if (!subject) continue;
        const name = subject.name_cn || subject.name;
        const year = subject.date
          ? Number.parseInt(subject.date.slice(0, 4), 10)
          : null;
        const updatedAt = resolveProviderDate({
          updatedAt: entry.updated_at,
        });

        if (isAnime) {
          const epStatus = entry.ep_status ?? 0;
          const title = await this.catalog.upsertTitle({
            type: "show",
            name,
            year: Number.isFinite(year) ? year : null,
            bangumiId: subject.id,
            posterUrl:
              subject.images?.large ||
              subject.images?.medium ||
              subject.images?.common ||
              null,
          });
          const dedupeKey = `bangumi:list:${entry.id}:${entry.type}:${epStatus}`;

          if (entry.type === "do" || entry.type === "collect" || epStatus > 0) {
            await this.catalog.recordWatch({
              userId,
              titleId: title.id,
              watchedAt: updatedAt,
              source: "bangumi",
              dedupeKey,
              action: "import",
              progress: bangumiAnimeProgress(
                epStatus,
                subject.eps,
                entry.type,
              ),
              rating: entry.rate || null,
              precision: "unknown",
            });
            accepted += 1;
          }

          if (entry.rate) {
            await this.catalog.upsertListState({
              userId,
              titleId: title.id,
              listType: "rating",
              source: "bangumi",
              rating: entry.rate,
              listedAt: updatedAt,
            });
          }

          this.enrichment.enqueueTitle(title.id);
        } else {
          const volStatus = entry.vol_status ?? 0;
          const listStatus = mapBangumiCollectionType(entry.type);
          const readTitle = await this.readCatalog.upsertTitle({
            format: "manga",
            name,
            year: Number.isFinite(year) ? year : null,
            volumes: subject.volumes ?? null,
            bangumiId: subject.id,
            coverUrl:
              subject.images?.large ||
              subject.images?.medium ||
              subject.images?.common ||
              null,
          });

          await this.readCatalog.upsertListState({
            userId,
            readTitleId: readTitle.id,
            listStatus,
            source: "bangumi",
            score: entry.rate || null,
            progressChapters: 0,
            progressVolumes: volStatus,
            listedAt: updatedAt,
          });

          if (entry.type === "wish") {
            accepted += 1;
            continue;
          }

          if (entry.type === "do" || entry.type === "collect" || volStatus > 0) {
            const dedupeKey = `bangumi:manga:${entry.id}:${entry.type}:${volStatus}`;
            await this.readCatalog.recordProgress({
              userId,
              readTitleId: readTitle.id,
              readAt: updatedAt,
              source: "bangumi",
              dedupeKey,
              action: "import",
              status: entry.type,
              volumesRead: volStatus || null,
              progress: bangumiMangaProgress(
                volStatus,
                subject.volumes,
                entry.type,
              ),
              rating: entry.rate || null,
              precision: "unknown",
              chaptersDelta: 0,
            });
            accepted += 1;
          }
        }
      }

      if (entries.length < 100) break;
      offset += 100;
      if (json.total != null && offset >= json.total) break;
    }

    return accepted;
  }
}
