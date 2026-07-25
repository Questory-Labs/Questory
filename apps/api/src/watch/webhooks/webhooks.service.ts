import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { UsersService } from "../users/users.service";
import { isWebhookSecretRequired } from "../lib/runtime-config";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
  ) {}

  /**
   * Resolve the owning user from a per-user watch_webhook ApiKey.
   * In local mode only, missing secret may fall back to the sole DB user.
   */
  async resolveWebhookUser(headerSecret?: string | string[]) {
    const got = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;
    const token = got?.trim();

    if (token) {
      const user = await this.users.findByWebhookToken(token);
      if (!user) {
        throw new UnauthorizedException("Invalid webhook secret");
      }
      return user;
    }

    if (isWebhookSecretRequired()) {
      throw new UnauthorizedException(
        "Webhook ApiKey required (mint in Settings → Watch)",
      );
    }

    const sole = await this.users.resolveSoleUser();
    if (!sole) {
      throw new UnauthorizedException(
        "Webhook ApiKey required (mint in Settings → Watch)",
      );
    }
    return sole;
  }

  /**
   * Plex webhook payload (media.scrobble / media.play).
   * https://support.plex.tv/articles/115002267047-webhooks/
   */
  async handlePlex(body: Record<string, unknown>, secret?: string | string[]) {
    const user = await this.resolveWebhookUser(secret);
    const event = String(body.event || "");
    if (!["media.scrobble", "media.play", "media.stop"].includes(event)) {
      return { ok: true, ignored: true, event };
    }
    // Only count completed scrobbles as watches
    if (event !== "media.scrobble") {
      return { ok: true, ignored: true, event };
    }

    const metadata = (body.Metadata || {}) as Record<string, unknown>;
    const type = String(metadata.type || "");
    const titleName = String(metadata.grandparentTitle || metadata.title || "");
    if (!titleName) return { ok: true, ignored: true, reason: "no title" };

    const year = metadata.year != null ? Number(metadata.year) : null;
    const isMovie = type === "movie";
    const title = await this.catalog.upsertTitle({
      type: isMovie ? "movie" : "show",
      name: isMovie
        ? String(metadata.title || titleName)
        : String(metadata.grandparentTitle || titleName),
      year: Number.isFinite(year as number) ? year : null,
    });

    let episodeId: string | undefined;
    if (!isMovie) {
      const season = Number(metadata.parentIndex ?? metadata.seasonNumber ?? 0);
      const ep = Number(metadata.index ?? metadata.episodeNumber ?? 0);
      const episode = await this.catalog.upsertEpisode({
        titleId: title.id,
        seasonNumber: season,
        episodeNumber: ep,
        name: String(metadata.title || "") || null,
        runtimeMinutes:
          metadata.duration != null
            ? Math.round(Number(metadata.duration) / 60000)
            : null,
      });
      episodeId = episode.id;
    }

    const watchedAt = new Date();
    const dedupeKey = `plex:${String(metadata.ratingKey || metadata.guid || titleName)}:${watchedAt.toISOString().slice(0, 13)}`;

    await this.catalog.recordWatch({
      userId: user.id,
      titleId: title.id,
      episodeId,
      watchedAt,
      source: "plex",
      dedupeKey,
      action: "scrobble",
      precision: "second",
      runtimeMinutes:
        metadata.duration != null
          ? Math.round(Number(metadata.duration) / 60000)
          : null,
      rawPayload: JSON.stringify(body).slice(0, 4000),
    });
    this.enrichment.enqueueTitle(title.id);
    return { ok: true, titleId: title.id };
  }

  /**
   * Jellyfin webhook (generic plugin JSON).
   * Expects NotificationType / Item fields commonly used by jellyfin-webhook.
   */
  async handleJellyfin(
    body: Record<string, unknown>,
    secret?: string | string[],
  ) {
    const user = await this.resolveWebhookUser(secret);
    const notificationType = String(
      body.NotificationType || body.notification_type || body.Event || "",
    ).toLowerCase();
    if (
      !notificationType.includes("playback") &&
      !notificationType.includes("scrobble") &&
      notificationType !== "play" &&
      !String(body.ItemType || "")
    ) {
      // Still try if Item present
      if (!body.Item && !body.Name) {
        return { ok: true, ignored: true, notificationType };
      }
    }

    const item = (body.Item || body) as Record<string, unknown>;
    const itemType = String(item.Type || item.ItemType || body.ItemType || "");
    const isMovie = /movie/i.test(itemType);
    const seriesName = String(
      item.SeriesName || body.SeriesName || item.Name || body.Name || "",
    );
    const movieName = String(item.Name || body.Name || "");
    const name = isMovie ? movieName : seriesName || movieName;
    if (!name) return { ok: true, ignored: true, reason: "no title" };

    const year = item.ProductionYear != null ? Number(item.ProductionYear) : null;
    const title = await this.catalog.upsertTitle({
      type: isMovie ? "movie" : "show",
      name,
      year: Number.isFinite(year as number) ? year : null,
    });

    let episodeId: string | undefined;
    if (!isMovie) {
      const season = Number(item.ParentIndexNumber ?? item.SeasonNumber ?? 0);
      const ep = Number(item.IndexNumber ?? item.EpisodeNumber ?? 0);
      const episode = await this.catalog.upsertEpisode({
        titleId: title.id,
        seasonNumber: season,
        episodeNumber: ep,
        name: movieName || null,
        runtimeMinutes:
          item.RunTimeTicks != null
            ? Math.round(Number(item.RunTimeTicks) / 10_000_000 / 60)
            : null,
      });
      episodeId = episode.id;
    }

    const watchedAt = new Date();
    const dedupeKey = `jellyfin:${String(item.Id || item.ItemId || name)}:${watchedAt.toISOString().slice(0, 13)}`;

    await this.catalog.recordWatch({
      userId: user.id,
      titleId: title.id,
      episodeId,
      watchedAt,
      source: "jellyfin",
      dedupeKey,
      action: "scrobble",
      precision: "second",
      rawPayload: JSON.stringify(body).slice(0, 4000),
    });
    this.enrichment.enqueueTitle(title.id);
    this.logger.log(`Jellyfin scrobble: ${name}`);
    return { ok: true, titleId: title.id };
  }
}
