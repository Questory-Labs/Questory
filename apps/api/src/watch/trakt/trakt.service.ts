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
import {
  resolveTraktClientId,
  resolveTraktClientSecret,
  resolveTraktRedirectUri,
} from "../lib/runtime-config";
import { providerFetch } from "../../lib/qhttp-outbound";

type TraktIds = {
  trakt?: number;
  slug?: string;
  imdb?: string;
  tmdb?: number;
};

type TraktMovie = {
  title?: string;
  year?: number;
  ids?: TraktIds;
};

type TraktShow = {
  title?: string;
  year?: number;
  ids?: TraktIds;
};

type TraktEpisode = {
  season?: number;
  number?: number;
  title?: string;
  ids?: TraktIds;
};

type TraktHistoryItem = {
  id?: number;
  watched_at?: string;
  action?: string;
  type?: string;
  movie?: TraktMovie;
  show?: TraktShow;
  episode?: TraktEpisode;
};

@Injectable()
export class TraktService {
  private readonly logger = new Logger(TraktService.name);
  /** In-flight syncHistory user ids (process-local; for UI status). */
  private readonly syncingUsers = new Set<string>();
  private readonly api = "https://api.trakt.tv";

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
  ) {}

  configured() {
    return Boolean(resolveTraktClientId() && resolveTraktClientSecret());
  }

  authUrl(state?: string) {
    if (!this.configured()) {
      throw new BadRequestException("TRAKT_CLIENT_ID/SECRET not configured");
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: resolveTraktClientId(),
      redirect_uri: resolveTraktRedirectUri(),
      ...(state ? { state } : {}),
    });
    return `https://trakt.tv/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, userId?: string) {
    if (!this.configured()) {
      throw new BadRequestException("TRAKT_CLIENT_ID/SECRET not configured");
    }
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user to attach Trakt to");

    const res = await providerFetch(`${this.api}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: resolveTraktClientId(),
        client_secret: resolveTraktClientSecret(),
        redirect_uri: resolveTraktRedirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Trakt token exchange failed: ${text}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      created_at?: number;
    };

    const expiresAt =
      data.expires_in != null
        ? new Date(Date.now() + data.expires_in * 1000)
        : null;

    const existing = await this.prisma.sourceConnection.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: "trakt" },
      },
    });

    await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: user.id, provider: "trakt" },
      },
      create: {
        userId: user.id,
        provider: "trakt",
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      },
    });

    if (!existing) {
      void this.syncHistory(user.id).catch((err) =>
        this.logger.error(
          `Trakt backfill failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }

    return { ok: true, userId: user.id };
  }

  async getConnection(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: "trakt" } },
    });
    if (!conn) {
      return {
        connected: false,
        userId: user.id,
        syncing: false,
      };
    }
    return {
      connected: true,
      userId: user.id,
      syncing: this.syncingUsers.has(user.id),
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
      syncCursor: conn.syncCursor,
    };
  }

  isSyncing(userId: string) {
    return this.syncingUsers.has(userId);
  }

  private async ensureAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: "trakt" } },
    });
    if (!conn) throw new BadRequestException("Trakt not connected");

    const expired =
      conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expired) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;

    const res = await providerFetch(`${this.api}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: conn.refreshToken,
        client_id: resolveTraktClientId(),
        client_secret: resolveTraktClientSecret(),
        redirect_uri: resolveTraktRedirectUri(),
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      this.logger.warn(`Trakt refresh failed: ${res.status}`);
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

  private async traktGet<T>(
    path: string,
    accessToken: string,
    query: Record<string, string> = {},
  ): Promise<{ data: T; pageCount: number }> {
    const url = new URL(`${this.api}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

    const res = await providerFetch(url, {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": resolveTraktClientId(),
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Trakt GET ${path}: ${res.status} ${text.slice(0, 200)}`);
    }
    const pageCount = Number(res.headers.get("x-pagination-page-count") || "1");
    const data = (await res.json()) as T;
    return { data, pageCount };
  }

  async syncHistory(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("No user");

    this.syncingUsers.add(user.id);
    try {
      const accessToken = await this.ensureAccessToken(user.id);
      const conn = await this.prisma.sourceConnection.findUnique({
        where: { userId_provider: { userId: user.id, provider: "trakt" } },
      });

      let page = 1;
      let pageCount = 1;
      let accepted = 0;
      const startAt = conn?.syncCursor || undefined;

      while (page <= pageCount) {
        const query: Record<string, string> = {
          page: String(page),
          limit: "100",
          extended: "full",
        };
        if (startAt) query.start_at = startAt;

        const { data, pageCount: pc } = await this.traktGet<TraktHistoryItem[]>(
          "/sync/history",
          accessToken,
          query,
        );
        pageCount = pc || 1;

        for (const item of data) {
          const ok = await this.ingestHistoryItem(user.id, item);
          if (ok) accepted += 1;
        }

        page += 1;
        await new Promise((r) => setTimeout(r, 200));
      }

      // Also pull ratings + watchlist for future recs (list state, not events)
      await this.syncRatings(user.id, accessToken).catch((e) =>
        this.logger.warn(`ratings sync: ${e instanceof Error ? e.message : e}`),
      );
      await this.syncWatchlist(user.id, accessToken).catch((e) =>
        this.logger.warn(`watchlist sync: ${e instanceof Error ? e.message : e}`),
      );

      const newest = await this.prisma.watchEvent.findFirst({
        where: { userId: user.id, source: "trakt" },
        orderBy: { watchedAt: "desc" },
      });

      await this.prisma.sourceConnection.update({
        where: { userId_provider: { userId: user.id, provider: "trakt" } },
        data: {
          lastSyncedAt: new Date(),
          syncCursor: newest?.watchedAt.toISOString() ?? conn?.syncCursor,
        },
      });

      return { ok: true, accepted, userId: user.id };
    } finally {
      this.syncingUsers.delete(user.id);
    }
  }

  private async ingestHistoryItem(userId: string, item: TraktHistoryItem) {
    if (!item.watched_at) return false;
    const watchedAt = new Date(item.watched_at);
    if (Number.isNaN(watchedAt.getTime())) return false;

    if (item.type === "movie" || item.movie) {
      const m = item.movie!;
      if (!m.title) return false;
      const title = await this.catalog.upsertTitle({
        type: "movie",
        name: m.title,
        year: m.year ?? null,
        traktId: m.ids?.trakt ?? null,
        tmdbId: m.ids?.tmdb ?? null,
        imdbId: m.ids?.imdb ?? null,
      });
      const dedupeKey = `trakt:history:${item.id ?? `${m.ids?.trakt}:${item.watched_at}`}`;
      await this.catalog.recordWatch({
        userId,
        titleId: title.id,
        watchedAt,
        source: "trakt",
        dedupeKey,
        action: item.action || "watch",
        precision: "second",
        rawPayload: JSON.stringify(item),
      });
      this.enrichment.enqueueTitle(title.id);
      return true;
    }

    if (item.type === "episode" || item.episode) {
      const show = item.show;
      const ep = item.episode;
      if (!show?.title || !ep) return false;
      const title = await this.catalog.upsertTitle({
        type: "show",
        name: show.title,
        year: show.year ?? null,
        traktId: show.ids?.trakt ?? null,
        tmdbId: show.ids?.tmdb ?? null,
        imdbId: show.ids?.imdb ?? null,
      });
      const episode = await this.catalog.upsertEpisode({
        titleId: title.id,
        seasonNumber: ep.season ?? 0,
        episodeNumber: ep.number ?? 0,
        name: ep.title ?? null,
        traktId: ep.ids?.trakt ?? null,
        tmdbId: ep.ids?.tmdb ?? null,
      });
      const dedupeKey = `trakt:history:${item.id ?? `${ep.ids?.trakt}:${item.watched_at}`}`;
      await this.catalog.recordWatch({
        userId,
        titleId: title.id,
        episodeId: episode.id,
        watchedAt,
        source: "trakt",
        dedupeKey,
        action: item.action || "watch",
        precision: "second",
        runtimeMinutes: episode.runtimeMinutes,
        rawPayload: JSON.stringify(item),
      });
      this.enrichment.enqueueTitle(title.id);
      return true;
    }

    return false;
  }

  private async syncRatings(userId: string, accessToken: string) {
    for (const type of ["movies", "shows"] as const) {
      const { data } = await this.traktGet<
        { rated_at?: string; rating?: number; movie?: TraktMovie; show?: TraktShow }[]
      >(`/sync/ratings/${type}`, accessToken, { limit: "100" });
      for (const row of data) {
        const entity = type === "movies" ? row.movie : row.show;
        if (!entity?.title) continue;
        const title = await this.catalog.upsertTitle({
          type: type === "movies" ? "movie" : "show",
          name: entity.title,
          year: entity.year ?? null,
          traktId: entity.ids?.trakt ?? null,
          tmdbId: entity.ids?.tmdb ?? null,
          imdbId: entity.ids?.imdb ?? null,
        });
        await this.catalog.upsertListState({
          userId,
          titleId: title.id,
          listType: "rating",
          source: "trakt",
          rating: row.rating ?? null,
          listedAt: row.rated_at ? new Date(row.rated_at) : null,
        });
        this.enrichment.enqueueTitle(title.id);
      }
    }
  }

  private async syncWatchlist(userId: string, accessToken: string) {
    for (const type of ["movies", "shows"] as const) {
      const { data } = await this.traktGet<
        { listed_at?: string; movie?: TraktMovie; show?: TraktShow }[]
      >(`/sync/watchlist/${type}`, accessToken, { limit: "100" });
      for (const row of data) {
        const entity = type === "movies" ? row.movie : row.show;
        if (!entity?.title) continue;
        const title = await this.catalog.upsertTitle({
          type: type === "movies" ? "movie" : "show",
          name: entity.title,
          year: entity.year ?? null,
          traktId: entity.ids?.trakt ?? null,
          tmdbId: entity.ids?.tmdb ?? null,
          imdbId: entity.ids?.imdb ?? null,
        });
        await this.catalog.upsertListState({
          userId,
          titleId: title.id,
          listType: "watchlist",
          source: "trakt",
          listedAt: row.listed_at ? new Date(row.listed_at) : null,
        });
        this.enrichment.enqueueTitle(title.id);
      }
    }
  }
}
