import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  WatchCatalogLog,
  WatchCatalogSearchHit,
  WatchCatalogSearchResponse,
} from "@questorylabs/shared";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { TmdbService, type TmdbMovie } from "../tmdb/tmdb.service";
import {
  AnilistSearch,
  anilistDisplayName,
  anilistFormatToType,
  anilistYear,
  type AnilistMediaHit,
} from "./anilist-search";
import {
  WATCH_MANUAL_PROVIDER_LIMIT,
  WATCH_MANUAL_SEARCH_LIMIT,
} from "./manual.constants";
import {
  mergeSearchHits,
  searchHitId,
  type ManualProviderHit,
} from "./manual-merge";

@Injectable()
export class ManualService {
  constructor(
    private readonly tmdb: TmdbService,
    private readonly anilist: AnilistSearch,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
  ) {}

  async search(query: string): Promise<WatchCatalogSearchResponse> {
    const [tmdbRaw, anilistRaw] = await Promise.all([
      this.tmdb.searchMulti(query, WATCH_MANUAL_PROVIDER_LIMIT),
      this.anilist.searchAnime(query, WATCH_MANUAL_PROVIDER_LIMIT),
    ]);
    const tmdbFailed = tmdbRaw == null;
    const anilistFailed = anilistRaw == null;
    const tmdbHits = (tmdbRaw ?? []).map((hit) => this.fromTmdb(hit));
    const anilistHits = (anilistRaw ?? []).map((hit) => this.fromAnilist(hit));

    if (
      tmdbHits.length === 0 &&
      anilistHits.length === 0 &&
      (tmdbFailed || anilistFailed)
    ) {
      throw new ServiceUnavailableException("Title search is unavailable");
    }

    const items: WatchCatalogSearchHit[] = mergeSearchHits(
      tmdbHits,
      anilistHits,
      WATCH_MANUAL_SEARCH_LIMIT,
    ).map((hit) => ({
      id: searchHitId(hit),
      name: hit.name,
      year: hit.year,
      type: hit.type,
      posterUrl: hit.posterUrl,
      tmdbId: hit.tmdbId,
      anilistId: hit.anilistId,
      sources: hit.sources,
      originCountry: hit.originCountry,
    }));

    return { items };
  }

  async log(userId: string, input: WatchCatalogLog) {
    const tmdbDetail = input.tmdbId
      ? input.type === "movie"
        ? await this.tmdb.getMovie(input.tmdbId)
        : await this.tmdb.getTv(input.tmdbId)
      : null;
    const anilistDetail = input.anilistId
      ? await this.anilist.getMedia(input.anilistId)
      : null;

    if (!tmdbDetail && !anilistDetail) {
      throw new NotFoundException("Title not found");
    }

    const name =
      (tmdbDetail
        ? tmdbDetail.title || tmdbDetail.name
        : null) ||
      (anilistDetail ? anilistDisplayName(anilistDetail) : null);
    if (!name) throw new NotFoundException("Title not found");

    const year =
      this.tmdb.yearFromDate(
        tmdbDetail?.release_date ?? tmdbDetail?.first_air_date,
      ) ?? (anilistDetail ? anilistYear(anilistDetail) : null);
    const posterUrl =
      this.tmdb.posterUrl(tmdbDetail?.poster_path) ??
      anilistDetail?.coverImage?.large ??
      null;
    const runtimeMinutes =
      this.tmdb.runtimeMinutes(tmdbDetail) ??
      anilistDetail?.duration ??
      null;
    const overview =
      tmdbDetail?.overview ||
      stripTags(anilistDetail?.description) ||
      null;

    const title = await this.catalog.upsertTitle({
      type: input.type,
      name,
      year,
      overview,
      runtimeMinutes,
      posterUrl,
      tmdbId: input.tmdbId ?? tmdbDetail?.id ?? null,
      imdbId: tmdbDetail?.imdb_id ?? null,
      anilistId: input.anilistId ?? anilistDetail?.id ?? null,
      malId: anilistDetail?.idMal ?? null,
    });

    const tmdbGenres = (tmdbDetail?.genres ?? [])
      .map((g) => g.name)
      .filter(Boolean);
    if (tmdbGenres.length) {
      await this.catalog.linkGenres(title.id, tmdbGenres, "tmdb");
    }
    if (anilistDetail?.genres?.length) {
      await this.catalog.linkGenres(title.id, anilistDetail.genres, "anilist");
    }

    let episodeId: string | null = null;
    if (input.type === "show") {
      const episode = await this.catalog.upsertEpisode({
        titleId: title.id,
        seasonNumber: input.seasonNumber!,
        episodeNumber: input.episodeNumber!,
      });
      episodeId = episode.id;
    }

    const watchedAt = dayNoonUtc(input.watchedAt);
    const epKey =
      input.type === "show"
        ? `${input.seasonNumber}:${input.episodeNumber}`
        : "0:0";
    const idPart =
      input.tmdbId != null ? `tmdb:${input.tmdbId}` : `al:${input.anilistId}`;
    const event = await this.catalog.recordWatch({
      userId,
      titleId: title.id,
      episodeId,
      watchedAt,
      source: "manual",
      dedupeKey: `manual:${idPart}:${input.type}:${epKey}:${input.watchedAt}`,
      action: "watch",
      rating: input.rating ?? null,
      runtimeMinutes,
      precision: "day",
    });

    if (input.rating != null) {
      await this.catalog.upsertListState({
        userId,
        titleId: title.id,
        listType: "rating",
        source: "manual",
        rating: input.rating,
        listedAt: watchedAt,
      });
    }

    this.enrichment.enqueueTitle(title.id);

    return {
      id: event.id,
      titleId: title.id,
      watchedAt: event.watchedAt.toISOString(),
    };
  }

  private fromTmdb(hit: TmdbMovie): ManualProviderHit {
    const type = hit.media_type === "tv" ? "show" : "movie";
    return {
      name: hit.title || hit.name || `TMDB ${hit.id}`,
      year: this.tmdb.yearFromDate(hit.release_date ?? hit.first_air_date),
      type,
      posterUrl: this.tmdb.posterUrl(hit.poster_path),
      tmdbId: hit.id,
      originCountry: hit.origin_country?.[0],
      sources: ["tmdb"],
    };
  }

  private fromAnilist(hit: AnilistMediaHit): ManualProviderHit {
    return {
      name: anilistDisplayName(hit),
      year: anilistYear(hit),
      type: anilistFormatToType(hit.format),
      posterUrl: hit.coverImage?.large ?? null,
      anilistId: hit.id,
      sources: ["anilist"],
    };
  }
}

function dayNoonUtc(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

function stripTags(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}
