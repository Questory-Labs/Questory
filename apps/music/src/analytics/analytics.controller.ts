import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService, RangeKey } from "./analytics.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentMusicUser } from "../auth/current-music-user.decorator";

@Controller("analytics")
@UseGuards(SessionUserGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  overview(@CurrentMusicUser() user: { userId: string }) {
    return this.analytics.overview(user.userId);
  }

  @Get("tops/:kind")
  tops(
    @CurrentMusicUser() user: { userId: string },
    @Param("kind") kind: "artists" | "albums" | "tracks" | "genres",
    @Query("range") range: RangeKey = "week",
    @Query("limit") limit?: string,
  ) {
    return this.analytics.tops(
      user.userId,
      kind,
      range || "week",
      limit != null ? Number(limit) : 20,
    );
  }

  @Get("timeseries")
  timeSeries(
    @CurrentMusicUser() user: { userId: string },
    @Query("granularity")
    granularity: "hourOfDay" | "dayOfWeek" | "day" | "week" = "day",
    @Query("range") range: RangeKey = "month",
  ) {
    return this.analytics.timeSeries(
      user.userId,
      granularity,
      range || "month",
    );
  }

  @Get("recent")
  recent(
    @CurrentMusicUser() user: { userId: string },
    @Query("limit") limit?: string,
  ) {
    return this.analytics.recent(
      user.userId,
      limit != null ? Number(limit) : 40,
    );
  }

  @Get("tracks/:id")
  trackDetail(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.analytics.trackDetail(user.userId, id);
  }

  @Get("artists/:id")
  artistDetail(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.analytics.artistDetail(user.userId, id);
  }
}
