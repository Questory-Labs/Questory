import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import {
  LibrarySortSchema,
  LibraryStatusFilterSchema,
  parsePageParam,
  parsePageSizeParam,
  type PublicApiScope,
} from "@questorylabs/shared";
import { ApiKeyGuard, type ApiKeyRequest } from "../auth/api-key.guard";
import { Scopes } from "../auth/scopes.decorator";
import { LibraryService } from "../library/library.service";
import { BacklogService } from "../library/backlog.service";
import { parseTimeZone } from "../lib/timezone";
import { UsersService } from "../users/users.service";
import { WishlistService } from "../wishlist/wishlist.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { parseRewindQuery } from "../rewind/rewind-query";
import { MonthlyRecapService } from "../recap/monthly-recap.service";
import { AnalyticsService as MusicAnalyticsService } from "../music/analytics/analytics.service";
import { AnalyticsService as WatchAnalyticsService } from "../watch/analytics/analytics.service";
import { ReadAnalyticsService } from "../read/analytics/analytics.service";
import { GamesRewindService } from "../games/rewind/games-rewind.service";
import { PublicApiService, stripCostFields } from "./public-api.service";

export const PUBLIC_API_PATH = "public/v1";
const RECENT_DEFAULT_LIMIT = 20;
const RECENT_MAX_LIMIT = 50;
const REWIND_DOMAINS = ["games", "music", "watch", "read", "all"] as const;
type RewindDomain = (typeof REWIND_DOMAINS)[number];

function paging(pageRaw?: string, pageSizeRaw?: string, fallbackSize = 24) {
  const page = parsePageParam(pageRaw, 1);
  const pageSize = parsePageSizeParam(pageSizeRaw, fallbackSize);
  if (page == null || pageSize == null) {
    throw new BadRequestException("Invalid page or pageSize");
  }
  return { page, pageSize };
}

function scopesOf(req: ApiKeyRequest): PublicApiScope[] {
  return req.apiKeyScopes ?? [];
}

@Controller({ path: PUBLIC_API_PATH, version: VERSION_NEUTRAL })
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(
    private readonly users: UsersService,
    private readonly library: LibraryService,
    private readonly backlog: BacklogService,
    private readonly wishlist: WishlistService,
    private readonly flags: FeatureFlagsService,
    private readonly recap: MonthlyRecapService,
    private readonly musicAnalytics: MusicAnalyticsService,
    private readonly watchAnalytics: WatchAnalyticsService,
    private readonly readAnalytics: ReadAnalyticsService,
    private readonly gamesRewind: GamesRewindService,
    private readonly publicApi: PublicApiService,
  ) {}

  @Get("me")
  @Scopes("profile:read")
  async me(@Req() req: ApiKeyRequest) {
    const user = await this.users.findById(req.userId);
    if (!user) throw new NotFoundException("User not found");
    return {
      id: user.id,
      personaName: user.personaName,
      avatarUrl: user.avatarUrl,
      profileUrl: user.profileUrl,
      countryCode: user.countryCode,
      steamId: user.steamId,
      createdAt: user.createdAt.toISOString(),
      scopes: scopesOf(req),
    };
  }

  @Get("library")
  @Scopes("library:read")
  async libraryList(
    @Req() req: ApiKeyRequest,
    @Query("q") q?: string,
    @Query("genre") genre?: string,
    @Query("tag") tag?: string,
    @Query("store") store?: string,
    @Query("minPlaytime") minPlaytime?: string,
    @Query("maxPlaytime") maxPlaytime?: string,
    @Query("unplayed") unplayed?: string,
    @Query("multiplayer") multiplayer?: string,
    @Query("singleplayer") singleplayer?: string,
    @Query("coop") coop?: string,
    @Query("pvp") pvp?: string,
    @Query("deck") deck?: string,
    @Query("controller") controller?: string,
    @Query("publisher") publisher?: string,
    @Query("developer") developer?: string,
    @Query("sort") sortRaw?: string,
    @Query("status") statusRaw?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const sort = sortRaw ? LibrarySortSchema.safeParse(sortRaw) : null;
    if (sort && !sort.success) throw new BadRequestException("Invalid sort");
    const status = statusRaw ? LibraryStatusFilterSchema.safeParse(statusRaw) : null;
    if (status && !status.success) throw new BadRequestException("Invalid status");
    const { page, pageSize } = paging(pageRaw, pageSizeRaw);
    const result = await this.library.list(req.userId, {
      q,
      genre,
      tag,
      store,
      minPlaytime: minPlaytime ? Number(minPlaytime) : undefined,
      maxPlaytime: maxPlaytime ? Number(maxPlaytime) : undefined,
      unplayed: unplayed === "true",
      multiplayer: multiplayer === "true",
      singleplayer: singleplayer === "true",
      coop: coop === "true",
      pvp: pvp === "true",
      deck: deck === "true",
      controller: controller === "true",
      publisher,
      developer,
      sort: sort?.data,
      status: status?.data,
      page,
      pageSize,
    });
    return stripCostFields(result);
  }

  @Get("library/backlog")
  @Scopes("library:read")
  libraryBacklog(@Req() req: ApiKeyRequest, @Query("tz") tz?: string) {
    return this.backlog.summary(req.userId, parseTimeZone(tz));
  }

  @Get("library/:id")
  @Scopes("library:read")
  async libraryOne(@Req() req: ApiKeyRequest, @Param("id") id: string) {
    const entry = /^\d+$/.test(id)
      ? await this.library.getOneByAppId(req.userId, Number(id))
      : await this.library.getOne(req.userId, id);
    return stripCostFields(entry);
  }

  @Get("now-playing")
  @Scopes("sessions:read")
  nowPlaying(@Req() req: ApiKeyRequest) {
    return this.publicApi.nowPlaying(req.userId, scopesOf(req));
  }

  @Get("recent")
  recent(@Req() req: ApiKeyRequest, @Query("limit") limitRaw?: string) {
    const limit = parsePageSizeParam(limitRaw, RECENT_DEFAULT_LIMIT, RECENT_MAX_LIMIT);
    if (limit == null) throw new BadRequestException("Invalid limit");
    return this.publicApi.recent(req.userId, scopesOf(req), limit);
  }

  @Get("wishlist")
  @Scopes("wishlist:read")
  wishlistList(
    @Req() req: ApiKeyRequest,
    @Query("store") store?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    return this.wishlist.list(req.userId, store, paging(pageRaw, pageSizeRaw));
  }

  @Get("wishlist/deals")
  @Scopes("wishlist:read")
  wishlistDeals(@Req() req: ApiKeyRequest) {
    return this.wishlist.dealAlerts(req.userId);
  }

  @Get("rewind/:domain/:period")
  @Scopes("rewind:read")
  async rewind(
    @Req() req: ApiKeyRequest,
    @Param("domain") domainRaw: string,
    @Param("period") period: string,
    @Query("tz") tz?: string,
  ) {
    if (!REWIND_DOMAINS.includes(domainRaw as RewindDomain)) {
      throw new BadRequestException(
        `Invalid domain. Expected one of: ${REWIND_DOMAINS.join(", ")}`,
      );
    }
    const domain = domainRaw as RewindDomain;
    const q = parseRewindQuery({ period, tz });
    switch (domain) {
      case "all":
        return this.recap.combinedStats(req.userId, q.period, q.timeZone);
      case "games":
        return this.gamesRewind.rewindStats(req.userId, q.period, q.timeZone);
      case "music":
        await this.flags.assertDomainEnabled("music");
        return this.musicAnalytics.rewindStats(req.userId, q.period, q.timeZone);
      case "watch":
        await this.flags.assertDomainEnabled("watch");
        return this.watchAnalytics.rewindStats(req.userId, q.period, q.timeZone);
      case "read":
        await this.flags.assertDomainEnabled("read");
        return this.readAnalytics.rewindStats(req.userId, q.period, q.timeZone);
    }
  }

  @Get("music/listens")
  @Scopes("music:read")
  musicListens(
    @Req() req: ApiKeyRequest,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const { page, pageSize } = paging(pageRaw, pageSizeRaw, 40);
    return this.musicAnalytics.recent(req.userId, page, pageSize);
  }

  @Get("watch/history")
  @Scopes("watch:read")
  watchHistory(
    @Req() req: ApiKeyRequest,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const { page, pageSize } = paging(pageRaw, pageSizeRaw, 40);
    return this.watchAnalytics.recent(req.userId, page, pageSize);
  }

  @Get("read/history")
  @Scopes("read:read")
  readHistory(
    @Req() req: ApiKeyRequest,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const { page, pageSize } = paging(pageRaw, pageSizeRaw, 40);
    return this.readAnalytics.recent(req.userId, page, pageSize);
  }
}
