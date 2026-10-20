import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { SteamAuthGuard } from "../../auth/auth.guard";
import type { RewindInsightResponse, RewindStatsResponse } from "@questorylabs/shared";
import { AnalyticsService } from "./analytics.service";
import { RewindAiService } from "../../rewind/rewind-ai.service";
import { parseRewindQuery } from "../../rewind/rewind-query";

@Controller("watch/analytics/rewind")
@UseGuards(SteamAuthGuard)
export class WatchRewindController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly rewindAi: RewindAiService,
  ) {}

  @Get("stats")
  async getStats(
    @Req() req: Request,
    @Query("period") period?: string,
    @Query("tz") tz?: string,
  ): Promise<RewindStatsResponse> {
    const userId = (req as any).userId;
    const q = parseRewindQuery({ period, tz });
    return this.analytics.rewindStats(userId, q.period, q.timeZone);
  }

  @Get("ai")
  async getAi(
    @Req() req: Request,
    @Query("period") period?: string,
    @Query("forceRedo") forceRedo?: string,
    @Query("tz") tz?: string,
  ): Promise<RewindInsightResponse> {
    const userId = (req as any).userId;
    const q = parseRewindQuery({ period, tz, forceRedo });
    return this.rewindAi.serve({
      userId,
      domain: "watch",
      period: q.period,
      forceRedo: q.forceRedo,
      loadStats: () => this.analytics.rewindStats(userId, q.period, q.timeZone),
    });
  }
}
