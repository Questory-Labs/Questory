import {
  BadRequestException,
  Controller,
  Get,
  MessageEvent,
  Param,
  Query,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import {
  AnalyticsService,
  RangeKey,
  TopsKind,
} from "./analytics.service";
import { parseTimeZone } from "../../lib/timezone";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentMusicUser } from "../auth/current-music-user.decorator";
import { PlayingNowService } from "../playing-now/playing-now.service";

const RANGES = new Set<RangeKey>(["day", "week", "month", "year", "all"]);
const TOPS_KINDS = new Set<TopsKind>([
  "artists",
  "albums",
  "tracks",
  "genres",
  "moods",
]);

function parseLimit(raw: string | undefined, fallback: number, max = 100) {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) {
    throw new BadRequestException("Invalid limit");
  }
  return n;
}

function parseTopsPaging(opts: {
  page?: string;
  pageSize?: string;
  limit?: string;
  defaultSize?: number;
}) {
  const page = parsePageParam(opts.page, 1);
  // Prefer pageSize; keep `limit` as a synonym for callers that only want a top-N slice.
  const sizeRaw =
    opts.pageSize != null && opts.pageSize !== ""
      ? opts.pageSize
      : opts.limit;
  const pageSize = parsePageSizeParam(sizeRaw, opts.defaultSize ?? 20, 100);
  if (page == null || pageSize == null) {
    throw new BadRequestException("Invalid page or pageSize");
  }
  return { page, pageSize };
}

function parseRange(raw: string | undefined, fallback: RangeKey): RangeKey {
  if (raw == null || raw === "") return fallback;
  if (!RANGES.has(raw as RangeKey)) {
    throw new BadRequestException("Invalid range");
  }
  return raw as RangeKey;
}

@Controller("music/analytics")
@UseGuards(SessionUserGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly playingNowService: PlayingNowService,
  ) {}

  @Get("overview")
  overview(
    @CurrentMusicUser() user: { userId: string },
    @Query("tz") tz?: string,
  ) {
    return this.analytics.overview(user.userId, parseTimeZone(tz));
  }

  @Get("insights")
  insights(
    @CurrentMusicUser() user: { userId: string },
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    return this.analytics.insights(
      user.userId,
      parseRange(range, "week"),
      parseTimeZone(tz),
    );
  }

  @Get("playing-now")
  playingNow(@CurrentMusicUser() user: { userId: string }) {
    return this.analytics.playingNow(user.userId);
  }

  @Sse("playing-now/stream")
  playingNowStream(
    @CurrentMusicUser() user: { userId: string },
  ): Observable<MessageEvent> {
    return this.playingNowService.streamStatus(user.userId);
  }

  @Get("breakdown/:kind")
  breakdown(
    @CurrentMusicUser() user: { userId: string },
    @Param("kind") kind: "years" | "services",
    @Query("range") range?: string,
    @Query("limit") limit?: string,
  ) {
    if (kind !== "years" && kind !== "services") {
      throw new BadRequestException("Invalid breakdown kind");
    }
    return this.analytics.breakdown(
      user.userId,
      kind,
      parseRange(range, "month"),
      parseLimit(limit, 20),
    );
  }

  @Get("tops/:kind")
  tops(
    @CurrentMusicUser() user: { userId: string },
    @Param("kind") kind: string,
    @Query("range") range?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("limit") limit?: string,
  ) {
    if (!TOPS_KINDS.has(kind as TopsKind)) {
      throw new BadRequestException("Invalid tops kind");
    }
    const paging = parseTopsPaging({ page, pageSize, limit, defaultSize: 20 });
    return this.analytics.tops(
      user.userId,
      kind as TopsKind,
      parseRange(range, "week"),
      paging.page,
      paging.pageSize,
    );
  }

  @Get("timeseries")
  timeSeries(
    @CurrentMusicUser() user: { userId: string },
    @Query("granularity")
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week" = "day",
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    const allowed = new Set(["hourOfDay", "dayOfWeek", "day", "week"]);
    if (!allowed.has(granularity)) {
      throw new BadRequestException("Invalid granularity");
    }
    return this.analytics.timeSeries(
      user.userId,
      granularity,
      parseRange(range, "month"),
      parseTimeZone(tz),
    );
  }

  @Get("recent")
  recent(
    @CurrentMusicUser() user: { userId: string },
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("limit") limit?: string,
  ) {
    const paging = parseTopsPaging({
      page,
      pageSize,
      limit,
      defaultSize: 40,
    });
    return this.analytics.recent(user.userId, paging.page, paging.pageSize);
  }

  @Get("tracks/:id/listens")
  trackListens(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("range") range?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("limit") limit?: string,
  ) {
    const paging = parseTopsPaging({
      page,
      pageSize,
      limit,
      defaultSize: 20,
    });
    return this.analytics.trackListens(
      user.userId,
      id,
      parseRange(range, "all"),
      paging.page,
      paging.pageSize,
    );
  }

  @Get("tracks/:id/timeseries")
  trackTimeSeries(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("granularity") granularity?: string,
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    const allowed = new Set(["hourOfDay", "dayOfWeek"]);
    if (!granularity || !allowed.has(granularity)) {
      throw new BadRequestException("Invalid granularity");
    }
    return this.analytics.trackTimeSeries(
      user.userId,
      id,
      granularity as "hourOfDay" | "dayOfWeek",
      parseRange(range, "all"),
      parseTimeZone(tz),
    );
  }

  @Get("tracks/:id/heatmap")
  trackHeatmap(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    return this.analytics.trackHeatmap(
      user.userId,
      id,
      parseRange(range, "all"),
      parseTimeZone(tz),
    );
  }

  @Get("tracks/:id")
  trackDetail(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    return this.analytics.trackDetail(
      user.userId,
      id,
      parseRange(range, "all"),
      parseTimeZone(tz),
    );
  }

  @Get("artists/:id")
  artistDetail(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("range") range?: string,
  ) {
    return this.analytics.artistDetail(
      user.userId,
      id,
      parseRange(range, "all"),
    );
  }

  @Get("albums/:id/listens")
  albumListens(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("range") range?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("limit") limit?: string,
  ) {
    const paging = parseTopsPaging({
      page,
      pageSize,
      limit,
      defaultSize: 20,
    });
    return this.analytics.albumListens(
      user.userId,
      id,
      parseRange(range, "all"),
      paging.page,
      paging.pageSize,
    );
  }

  @Get("albums/:id/timeseries")
  albumTimeSeries(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("granularity") granularity?: string,
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    const allowed = new Set(["hourOfDay", "dayOfWeek"]);
    if (!granularity || !allowed.has(granularity)) {
      throw new BadRequestException("Invalid granularity");
    }
    return this.analytics.albumTimeSeries(
      user.userId,
      id,
      granularity as "hourOfDay" | "dayOfWeek",
      parseRange(range, "all"),
      parseTimeZone(tz),
    );
  }

  @Get("albums/:id")
  albumDetail(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Query("range") range?: string,
    @Query("tz") tz?: string,
  ) {
    return this.analytics.albumDetail(
      user.userId,
      id,
      parseRange(range, "all"),
      parseTimeZone(tz),
    );
  }
}
