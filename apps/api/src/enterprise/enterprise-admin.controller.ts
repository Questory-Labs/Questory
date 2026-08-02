import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { SteamAuthGuard, type SessionUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";

@Controller("enterprise")
@UseGuards(SteamAuthGuard, AdminGuard)
export class EnterpriseAdminController {
  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly rateLimit: EnterpriseRateLimitService,
  ) {}

  private async forwardAdmin<T>(
    user: SessionUser,
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined>,
  ): Promise<T> {
    await this.rateLimit.assertAllowed(user.userId, "admin");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: true,
      method,
      path,
      body,
      query,
    });
  }

  @Get("guardrails")
  getGuardrails(@CurrentUser() user: SessionUser) {
    return this.forwardAdmin(user, "GET", "/v1/enterprise/guardrails");
  }

  @Put("guardrails")
  putGuardrails(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.forwardAdmin(
      user,
      "PUT",
      "/v1/enterprise/guardrails",
      body,
    );
  }

  @Get("otel/health")
  otelHealth(@CurrentUser() user: SessionUser) {
    return this.forwardAdmin(user, "GET", "/v1/enterprise/otel/health");
  }

  @Get("otel/usage")
  otelUsage(@CurrentUser() user: SessionUser, @Query("since") since?: string) {
    return this.forwardAdmin(user, "GET", "/v1/enterprise/otel/usage", undefined, {
      since,
    });
  }

  @Get("otel/pricing")
  otelPricing(@CurrentUser() user: SessionUser) {
    return this.forwardAdmin(user, "GET", "/v1/enterprise/otel/pricing");
  }

  @Put("otel/pricing")
  putOtelPricing(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.forwardAdmin(
      user,
      "PUT",
      "/v1/enterprise/otel/pricing",
      body,
    );
  }

  @Get("otel/traces")
  otelTraces(
    @CurrentUser() user: SessionUser,
    @Query("since") since?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.forwardAdmin(
      user,
      "GET",
      "/v1/enterprise/otel/traces",
      undefined,
      { since, limit, offset },
    );
  }

  @Get("otel/traces/:traceId")
  otelTrace(
    @CurrentUser() user: SessionUser,
    @Param("traceId") traceId: string,
  ) {
    return this.forwardAdmin(
      user,
      "GET",
      `/v1/enterprise/otel/traces/${encodeURIComponent(traceId)}`,
    );
  }
}
