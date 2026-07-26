import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import {
  AnalyticsService,
  MediaType,
  RangeKey,
} from "./analytics.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";

const RANGES = new Set<RangeKey>(["day", "week", "month", "year", "all"]);
const MEDIA_TYPES = new Set<MediaType>(["movie", "show"]);

function parseLimit(raw: string | undefined, fallback: number, max = 100) {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) {
    throw new BadRequestException("Invalid limit");
  }
  return n;
}

function parseRange(raw: string | undefined, fallback: RangeKey): RangeKey {
  if (raw == null || raw === "") return fallback;
  if (!RANGES.has(raw as RangeKey)) {
    throw new BadRequestException("Invalid range");
  }
  return raw as RangeKey;
}

function parseMediaType(raw: string | undefined): MediaType | undefined {
  if (raw == null || raw === "" || raw === "all") return undefined;
  if (!MEDIA_TYPES.has(raw as MediaType)) {
    throw new BadRequestException("Invalid type");
  }
  return raw as MediaType;
}

@Controller("watch/analytics")
@UseGuards(SessionUserGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  overview(@CurrentWatchUserId() userId: string) {
    return this.analytics.overview(userId);
  }

  @Get("insights")
  insights(
    @CurrentWatchUserId() userId: string,
    @Query("range") range?: string,
    @Query("type") type?: string,
  ) {
    return this.analytics.insights(
      userId,
      parseRange(range, "week"),
      parseMediaType(type),
    );
  }

  @Get("breakdown/:kind")
  breakdown(
    @CurrentWatchUserId() userId: string,
    @Param("kind") kind: "years" | "sources",
    @Query("range") range?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
  ) {
    if (kind !== "years" && kind !== "sources") {
      throw new BadRequestException("Invalid breakdown kind");
    }
    return this.analytics.breakdown(
      userId,
      kind,
      parseRange(range, "month"),
      parseLimit(limit, 20),
      parseMediaType(type),
    );
  }

  @Get("tops/:kind")
  tops(
    @Param("kind") kind: "titles" | "genres" | "movies" | "shows",
    @Query("range") range: string | undefined,
    @Query("limit") limit: string | undefined,
    @CurrentWatchUserId() userId: string,
  ) {
    return this.analytics.tops(
      kind,
      parseRange(range, "week"),
      parseLimit(limit, 20),
      userId,
    );
  }

  @Get("timeseries")
  timeSeries(
    @Query("granularity")
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week" = "day",
    @Query("range") range: string | undefined,
    @Query("type") type: string | undefined,
    @CurrentWatchUserId() userId: string,
  ) {
    const allowed = new Set(["hourOfDay", "dayOfWeek", "day", "week"]);
    if (!allowed.has(granularity)) {
      throw new BadRequestException("Invalid granularity");
    }
    return this.analytics.timeSeries(
      granularity,
      parseRange(range, "month"),
      userId,
      parseMediaType(type),
    );
  }

  @Get("recent")
  recent(
    @Query("page") pageRaw: string | undefined,
    @Query("pageSize") pageSizeRaw: string | undefined,
    @Query("limit") limitRaw: string | undefined,
    @CurrentWatchUserId() userId: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(pageSizeRaw ?? limitRaw, 40);
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.analytics.recent(userId, page, pageSize);
  }
}
