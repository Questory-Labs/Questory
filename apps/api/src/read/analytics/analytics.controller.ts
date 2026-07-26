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
  FormatFilter,
  RangeKey,
  ReadAnalyticsService,
} from "./analytics.service";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { CurrentReadUserId } from "../auth/current-read-user.decorator";

const RANGES = new Set<RangeKey>(["day", "week", "month", "year", "all"]);
const FORMATS = new Set<FormatFilter>([
  "manga",
  "manhwa",
  "manhua",
  "novel",
  "one_shot",
  "other",
]);

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

function parseFormat(raw: string | undefined): FormatFilter | undefined {
  if (raw == null || raw === "" || raw === "all") return undefined;
  if (!FORMATS.has(raw as FormatFilter)) {
    throw new BadRequestException("Invalid format");
  }
  return raw as FormatFilter;
}

@Controller("read/analytics")
@UseGuards(ReadSessionUserGuard)
export class ReadAnalyticsController {
  constructor(private readonly analytics: ReadAnalyticsService) {}

  @Get("overview")
  overview(@CurrentReadUserId() userId: string) {
    return this.analytics.overview(userId);
  }

  @Get("insights")
  insights(
    @CurrentReadUserId() userId: string,
    @Query("range") range?: string,
    @Query("format") format?: string,
  ) {
    return this.analytics.insights(
      userId,
      parseRange(range, "week"),
      parseFormat(format),
    );
  }

  @Get("breakdown/:kind")
  breakdown(
    @CurrentReadUserId() userId: string,
    @Param("kind") kind: "years" | "sources" | "formats" | "statuses",
    @Query("range") range?: string,
    @Query("limit") limit?: string,
    @Query("format") format?: string,
  ) {
    if (
      kind !== "years" &&
      kind !== "sources" &&
      kind !== "formats" &&
      kind !== "statuses"
    ) {
      throw new BadRequestException("Invalid breakdown kind");
    }
    return this.analytics.breakdown(
      userId,
      kind,
      parseRange(range, "month"),
      parseLimit(limit, 20),
      parseFormat(format),
    );
  }

  @Get("tops/:kind")
  tops(
    @Param("kind") kind: "titles" | "genres" | "formats",
    @Query("range") range: string | undefined,
    @Query("limit") limit: string | undefined,
    @CurrentReadUserId() userId: string,
  ) {
    if (kind !== "titles" && kind !== "genres" && kind !== "formats") {
      throw new BadRequestException("Invalid tops kind");
    }
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
    @Query("format") format: string | undefined,
    @CurrentReadUserId() userId: string,
  ) {
    const allowed = new Set(["hourOfDay", "dayOfWeek", "day", "week"]);
    if (!allowed.has(granularity)) {
      throw new BadRequestException("Invalid granularity");
    }
    return this.analytics.timeSeries(
      granularity,
      parseRange(range, "month"),
      userId,
      parseFormat(format),
    );
  }

  @Get("recent")
  recent(
    @Query("page") pageRaw: string | undefined,
    @Query("pageSize") pageSizeRaw: string | undefined,
    @Query("limit") limitRaw: string | undefined,
    @CurrentReadUserId() userId: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(pageSizeRaw ?? limitRaw, 40);
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.analytics.recent(userId, page, pageSize);
  }
}
