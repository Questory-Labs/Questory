import { BadRequestException, Injectable } from "@nestjs/common";
import type { RewindInsightResponse } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { callRewindGenerate, type RewindAiDomain } from "../lib/rewind-ai-client";
import { assertRewindAiPeriodAllowed } from "../lib/rewind-period";

@Injectable()
export class RewindAiService {
  constructor(private readonly prisma: PrismaService) {}

  async serve(input: {
    userId: string;
    domain: RewindAiDomain;
    period: string;
    forceRedo: boolean;
    loadStats: () => Promise<unknown>;
  }): Promise<RewindInsightResponse> {
    const { userId, domain, period } = input;
    assertRewindAiPeriodAllowed(period);
    const key = { userId_domain_period: { userId, domain, period } };

    if (!input.forceRedo) {
      const cached = await this.prisma.aiInsightCache.findUnique({ where: key });
      if (cached?.content.trim()) {
        return {
          period,
          content: cached.content,
          generatedAt: cached.updatedAt.toISOString(),
          cached: true,
        };
      }
    }

    const stats = await input.loadStats();
    let content: string;
    try {
      content = await callRewindGenerate(userId, domain, period, stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      throw new BadRequestException(message);
    }

    const saved = await this.prisma.aiInsightCache.upsert({
      where: key,
      create: { userId, domain, period, content },
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
