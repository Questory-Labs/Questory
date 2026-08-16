import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SteamAuthGuard, type SessionUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";
import {
  EntitlementGuard,
  RequireEntitlement,
} from "../entitlements/entitlement.guard";

@Controller("recommendations")
@UseGuards(SteamAuthGuard, EntitlementGuard)
@RequireEntitlement("recommendations")
export class EnterpriseRecommendationsController {
  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly rateLimit: EnterpriseRateLimitService,
  ) {}

  @Post()
  async recommendations(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ) {
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations",
      body,
    });
  }

  @Post("goals")
  async goals(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/goals",
      body,
    });
  }

  @Post("curate")
  async curate(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    await this.rateLimit.assertAllowed(user.userId, "llm");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/curate",
      body,
    });
  }

  @Post("curate/cache")
  async curateCache(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/curate/cache",
      body,
    });
  }

  @Get("curate/:id")
  async getJob(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "GET",
      path: `/v1/recommendations/curate/${encodeURIComponent(id)}`,
    });
  }

  @Post("feedback")
  async feedback(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    await this.rateLimit.assertAllowed(user.userId, "feedback");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/feedback",
      body,
    });
  }
}
