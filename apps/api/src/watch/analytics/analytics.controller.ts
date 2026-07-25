import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AnalyticsService, RangeKey } from "./analytics.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";

function parseLimit(raw: string | undefined, fallback: number, max = 100) {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) {
    throw new BadRequestException("Invalid limit");
  }
  return n;
}

@Controller("watch/analytics")
@UseGuards(SessionUserGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  overview(@CurrentWatchUserId() userId: string) {
    return this.analytics.overview(userId);
  }

  @Get("tops/:kind")
  tops(
    @Param("kind") kind: "titles" | "genres" | "movies" | "shows",
    @Query("range") range: RangeKey = "week",
    @Query("limit") limit: string | undefined,
    @CurrentWatchUserId() userId: string,
  ) {
    return this.analytics.tops(
      kind,
      range || "week",
      parseLimit(limit, 20),
      userId,
    );
  }

  @Get("timeseries")
  timeSeries(
    @Query("granularity")
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week" = "day",
    @Query("range") range: RangeKey = "month",
    @CurrentWatchUserId() userId: string,
  ) {
    return this.analytics.timeSeries(granularity, range || "month", userId);
  }

  @Get("recent")
  recent(
    @Query("limit") limit: string | undefined,
    @CurrentWatchUserId() userId: string,
  ) {
    return this.analytics.recent(parseLimit(limit, 40), userId);
  }
}
