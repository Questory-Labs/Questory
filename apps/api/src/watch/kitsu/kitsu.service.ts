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
  kitsuAnimeProgress,
  kitsuMangaProgress,
  mapKitsuListStatus,
} from "../../read/kitsu/kitsu-map";
import { providerFetch } from "../lib/provider-fetch";
import { resolveProviderDate } from "../lib/resolve-date";

type KitsuLibraryEntry = {
  id: string;
  attributes: {
    status: string;
    progress: number;
    ratingTwenty?: number | null;
    finishedAt?: string | null;
    updatedAt: string;
  };
  relationships: {
    anime?: { data?: { id: string; type: string } | null };
    manga?: { data?: { id: string; type: string } | null };
  };
};

type KitsuMedia = {
  id: string;
  attributes: {
    canonicalTitle: string;
    titles?: { en_us?: string; en_jp?: string };
    episodeCount?: number | null;
    chapterCount?: number | null;
    volumeCount?: number | null;
    posterImage?: { large?: string; medium?: string };
    startDate?: string | null;
  };
};

@Injectable()
export class KitsuService {
  private readonly logger = new Logger(KitsuService.name);
  private readonly api = "https://kitsu.io/api/edge";
  private readonly syncingUsers = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
    private readonly readCatalog: ReadCatalogService,
  ) {}

  configured() {
    return true;
  }

  async connect(email: string, password: string, userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");
    if (!email?.trim() || !password) {
      throw new BadRequestException("Email and password are required");
    }

    const body = new URLSearchParams({
      grant_type: "password",
      username: email.trim(),
      password,
    });
    const res = await providerFetch("https://kitsu.io/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new BadRequestException(
        `Kitsu authentication failed: ${(await res.text()).slice(0, 200)}`,
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
        userId_provider: { userId: user.id, provider: "kitsu" },
      },
    });

    await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "kitsu" },
      },
      create: {
        userId: user.id,
        provider: "kitsu",
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
          `Kitsu sync failed: ${e instanceof Error ? e.message : e}`,
        ),
      );
    }

    return { ok: true, userId: user.id };
  }

  async getConnection(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "kitsu" } },
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
      where: { userId_provider: { userId: user.id, provider: "kitsu" } },
    });
    if (!conn) throw new BadRequestException("Kitsu not connected");

    this.syncingUsers.add(user.id);
    try {
      const token = await this.ensureAccessToken(user.id);
      const profile = await this.apiGet<{ data: Array<{ id: string }> }>(
        "/users?filter[self]=true",
        token,
      );
      const kitsuUserId = profile.data?.[0]?.id;
      if (!kitsuUserId) throw new BadRequestException("Kitsu user missing");

      const animeAccepted = await this.syncLibrary(
        user.id,
        token,
        kitsuUserId,
        "anime",
      );
      const mangaAccepted = await this.syncLibrary(
        user.id,
        token,
        kitsuUserId,
        "manga",
      );
      await this.prisma.sourceConnection.update({
        where: { id: conn.id },
        data: {
          lastSyncedAt: new Date(),
          externalUserId: kitsuUserId,
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

  private async ensureAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: "kitsu" } },
    });
    if (!conn) throw new BadRequestException("Kitsu not connected");

    const expired =
      conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expired) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refreshToken,
    });
    const res = await providerFetch("https://kitsu.io/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      this.logger.warn(`Kitsu refresh failed: ${res.status}`);
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

  private async apiGet<T>(path: string, token: string): Promise<T> {
    const res = await providerFetch(`${this.api}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (!res.ok) {
      throw new Error(
        `Kitsu GET ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`,
      );
    }
    return res.json() as Promise<T>;
  }

  private mediaTitle(media: KitsuMedia): string {
    return (
      media.attributes.titles?.en_us ||
      media.attributes.titles?.en_jp ||
      media.attributes.canonicalTitle
    );
  }

  private async syncLibrary(
    userId: string,
    token: string,
    kitsuUserId: string,
    kind: "anime" | "manga",
  ): Promise<number> {
    let offset = 0;
    let accepted = 0;
    const include = kind === "anime" ? "anime" : "manga";

    while (true) {
      const json = await this.apiGet<{
        data: KitsuLibraryEntry[];
        included?: KitsuMedia[];
        links?: { next?: string };
      }>(
        `/library-entries?filter[user_id]=${kitsuUserId}&filter[kind]=${kind}&include=${include}&page[limit]=100&page[offset]=${offset}`,
        token,
      );

      const mediaMap = new Map<string, KitsuMedia>();
      for (const item of json.included ?? []) {
        if (item.id) mediaMap.set(item.id, item);
      }

      const entries = json.data ?? [];
      if (!entries.length) break;

      for (const entry of entries) {
        const rel =
          kind === "anime"
            ? entry.relationships.anime?.data
            : entry.relationships.manga?.data;
        if (!rel?.id) continue;
        const media = mediaMap.get(rel.id);
        if (!media) continue;

        const status = entry.attributes.status;
        const progress = entry.attributes.progress ?? 0;
        const rating = entry.attributes.ratingTwenty
          ? entry.attributes.ratingTwenty / 2
          : null;
        const updatedAt = resolveProviderDate({
          updatedAt: entry.attributes.updatedAt,
          finishedAt: entry.attributes.finishedAt,
        });
        const year = media.attributes.startDate
          ? Number.parseInt(media.attributes.startDate.slice(0, 4), 10)
          : null;
        const name = this.mediaTitle(media);
        const kitsuId = Number.parseInt(media.id, 10);

        if (kind === "anime") {
          const title = await this.catalog.upsertTitle({
            type: "show",
            name,
            year: Number.isFinite(year) ? year : null,
            kitsuId: Number.isFinite(kitsuId) ? kitsuId : null,
            posterUrl:
              media.attributes.posterImage?.large ||
              media.attributes.posterImage?.medium ||
              null,
          });
          const dedupeKey = `kitsu:list:${entry.id}:${status}:${progress}`;

          if (status === "completed" || status === "current" || progress > 0) {
            await this.catalog.recordWatch({
              userId,
              titleId: title.id,
              watchedAt: updatedAt,
              source: "kitsu",
              dedupeKey,
              action: "import",
              progress: kitsuAnimeProgress(
                progress,
                media.attributes.episodeCount,
                status,
              ),
              rating,
              precision: entry.attributes.finishedAt ? "day" : "unknown",
            });
            accepted += 1;
          }

          if (rating) {
            await this.catalog.upsertListState({
              userId,
              titleId: title.id,
              listType: "rating",
              source: "kitsu",
              rating,
              listedAt: updatedAt,
            });
          }

          this.enrichment.enqueueTitle(title.id);
        } else {
          const listStatus = mapKitsuListStatus(status);
          const readTitle = await this.readCatalog.upsertTitle({
            format: "manga",
            name,
            year: Number.isFinite(year) ? year : null,
            chapters: media.attributes.chapterCount ?? null,
            volumes: media.attributes.volumeCount ?? null,
            kitsuId: Number.isFinite(kitsuId) ? kitsuId : null,
            coverUrl:
              media.attributes.posterImage?.large ||
              media.attributes.posterImage?.medium ||
              null,
          });

          await this.readCatalog.upsertListState({
            userId,
            readTitleId: readTitle.id,
            listStatus,
            source: "kitsu",
            score: rating,
            progressChapters: progress,
            progressVolumes: 0,
            listedAt: updatedAt,
          });

          if (status === "planned") {
            accepted += 1;
            continue;
          }

          if (status === "completed" || status === "current" || progress > 0) {
            const dedupeKey = `kitsu:manga:${entry.id}:${status}:${progress}`;
            await this.readCatalog.recordProgress({
              userId,
              readTitleId: readTitle.id,
              readAt: updatedAt,
              source: "kitsu",
              dedupeKey,
              action: "import",
              status,
              chaptersRead: progress || null,
              progress: kitsuMangaProgress(
                progress,
                media.attributes.chapterCount,
                status,
              ),
              rating,
              precision: entry.attributes.finishedAt ? "day" : "unknown",
              chaptersDelta: progress,
            });
            accepted += 1;
          }
        }
      }

      if (!json.links?.next) break;
      offset += 100;
    }

    return accepted;
  }
}
