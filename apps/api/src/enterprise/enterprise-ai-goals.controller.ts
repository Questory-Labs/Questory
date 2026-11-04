import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AiGoalRerollRequestSchema } from "@questorylabs/shared";
import { SteamAuthGuard, type SessionUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { EnterpriseAiGoalsService } from "./enterprise-ai-goals.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";

@Controller("recommendations/goals/ai")
@UseGuards(SteamAuthGuard)
export class EnterpriseAiGoalsController {
  constructor(
    private readonly aiGoals: EnterpriseAiGoalsService,
    private readonly rateLimit: EnterpriseRateLimitService,
  ) {}

  @Post()
  async board(@CurrentUser() user: SessionUser) {
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.aiGoals.board(user.userId);
  }

  @Post("reroll")
  async reroll(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = AiGoalRerollRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    await this.rateLimit.assertAllowed(user.userId, "llm");
    return this.aiGoals.reroll(user.userId, parsed.data.itemKey);
  }
}
