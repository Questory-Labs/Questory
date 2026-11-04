import { HttpException, Injectable, Logger } from "@nestjs/common";
import type { AiGoalsResponse, GoalDomain } from "@questorylabs/shared";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { PrismaService } from "../prisma/prisma.service";
import { EnterpriseProxyService } from "./enterprise-proxy.service";

export const AI_GOALS_CRON_USER_LIMIT = 200;
const AI_GOALS_TIMEOUT_MS = 90_000;
const AI_GOALS_MAX_CONSECUTIVE_UNAVAILABLE = 3;

export type AiGoalsRefreshResult = {
  users: number;
  boards: number;
  noSources: number;
  failed: number;
  skipped?: "enterprise_unavailable";
};

@Injectable()
export class EnterpriseAiGoalsService {
  private readonly logger = new Logger(EnterpriseAiGoalsService.name);

  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly flags: FeatureFlagsService,
    private readonly prisma: PrismaService,
  ) {}

  private async enabledDomains(): Promise<GoalDomain[]> {
    const [music, watch, read] = await Promise.all([
      this.flags.isDomainEnabled("music"),
      this.flags.isDomainEnabled("watch"),
      this.flags.isDomainEnabled("read"),
    ]);
    const domains: GoalDomain[] = ["games"];
    if (music) domains.push("music");
    if (watch) domains.push("watch");
    if (read) domains.push("read");
    return domains;
  }

  async board(userId: string): Promise<AiGoalsResponse> {
    return this.proxy.forward<AiGoalsResponse>({
      userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/goals/ai",
      body: { domains: await this.enabledDomains() },
      retries: 0,
      timeoutMs: AI_GOALS_TIMEOUT_MS,
    });
  }

  async reroll(userId: string, itemKey: string): Promise<AiGoalsResponse> {
    return this.proxy.forward<AiGoalsResponse>({
      userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/goals/ai/reroll",
      body: { itemKey, domains: await this.enabledDomains() },
      retries: 0,
      timeoutMs: AI_GOALS_TIMEOUT_MS,
    });
  }

  async refreshBoards(): Promise<AiGoalsRefreshResult> {
    const result: AiGoalsRefreshResult = { users: 0, boards: 0, noSources: 0, failed: 0 };
    try {
      await this.proxy.forwardPublic("/health");
    } catch {
      return { ...result, skipped: "enterprise_unavailable" };
    }
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { accounts: { some: { provider: "steam" } } },
          { sourceConnections: { some: {} } },
          { apiKeys: { some: { revokedAt: null } } },
        ],
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: AI_GOALS_CRON_USER_LIMIT,
    });
    result.users = users.length;
    let consecutiveUnavailable = 0;
    for (const user of users) {
      try {
        const board = await this.board(user.id);
        if (board.status === "no_sources") {
          result.noSources += 1;
        } else {
          result.boards += 1;
        }
        consecutiveUnavailable = 0;
      } catch (err) {
        result.failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`AI goals refresh failed for user ${user.id}: ${message}`);
        consecutiveUnavailable =
          err instanceof HttpException && err.getStatus() === 503
            ? consecutiveUnavailable + 1
            : 0;
        if (consecutiveUnavailable >= AI_GOALS_MAX_CONSECUTIVE_UNAVAILABLE) {
          return { ...result, skipped: "enterprise_unavailable" };
        }
      }
    }
    return result;
  }
}
