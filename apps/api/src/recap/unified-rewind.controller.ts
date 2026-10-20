import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import type { RewindAllStats, RewindInsightResponse } from "@questorylabs/shared";
import { SteamAuthGuard } from "../auth/auth.guard";
import { RewindAiService } from "../rewind/rewind-ai.service";
import { parseRewindQuery } from "../rewind/rewind-query";
import { MonthlyRecapService } from "./monthly-recap.service";

@Controller("rewind")
@UseGuards(SteamAuthGuard)
export class UnifiedRewindController {
  constructor(
    private readonly recap: MonthlyRecapService,
    private readonly rewindAi: RewindAiService,
  ) {}

  @Get("stats")
  async getStats(
    @Req() req: Request,
    @Query("period") period?: string,
    @Query("tz") tz?: string,
  ): Promise<RewindAllStats> {
    const userId = (req as any).userId;
    const q = parseRewindQuery({ period, tz });
    return this.recap.combinedStats(userId, q.period, q.timeZone);
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
      domain: "all",
      period: q.period,
      forceRedo: q.forceRedo,
      loadStats: () => this.recap.combinedStats(userId, q.period, q.timeZone),
    });
  }
}
