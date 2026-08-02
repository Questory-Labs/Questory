import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SteamAuthGuard } from '../../auth/auth.guard';
import { RewindInsightResponse, RewindStatsResponse } from '@questorylabs/shared';
import { AnalyticsService } from './analytics.service';
import { callRewindGenerate } from '../../lib/rewind-ai-client';

@Controller('music/analytics/rewind')
@UseGuards(SteamAuthGuard)
export class RewindController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService
  ) {}

  @Get('stats')
  async getStats(
    @Req() req: Request,
    @Query('period') period: string,
    @Query('tz') tz?: string
  ): Promise<RewindStatsResponse> {
    const userId = (req as any).userId;
    if (!period || !/^\d{4}(-\d{2})?$/.test(period)) {
      throw new BadRequestException('period must be YYYY or YYYY-MM');
    }
    return this.analytics.rewindStats(userId, period, tz || "UTC");
  }

  @Get('ai')
  async getAi(
    @Req() req: Request,
    @Query('period') period: string,
    @Query('forceRedo') forceRedoStr: string,
    @Query('tz') tz?: string
  ): Promise<RewindInsightResponse> {
    const userId = (req as any).userId;
    if (!period || !/^\d{4}(-\d{2})?$/.test(period)) {
      throw new BadRequestException('period must be YYYY or YYYY-MM');
    }
    const forceRedo = forceRedoStr === 'true';
    const timeZone = tz || "UTC";

    if (!forceRedo) {
      const cached = await this.prisma.aiInsightCache.findUnique({
        where: { userId_domain_period: { userId, domain: 'music', period } },
      });
      if (cached?.content.trim()) {
        return {
          period,
          content: cached.content,
          generatedAt: cached.updatedAt.toISOString(),
          cached: true,
        };
      }
    }

    const stats = await this.analytics.rewindStats(userId, period, timeZone);
    let content: string;
    try {
      content = await callRewindGenerate(req, 'music', period, stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      throw new BadRequestException(message);
    }

    const saved = await this.prisma.aiInsightCache.upsert({
      where: { userId_domain_period: { userId, domain: 'music', period } },
      create: { userId, domain: 'music', period, content },
      update: { content },
    });

    return {
      period,
      content: saved.content,
      generatedAt: saved.updatedAt.toISOString(),
      cached: false,
    };
  }
}
