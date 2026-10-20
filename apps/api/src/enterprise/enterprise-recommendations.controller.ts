import {
  BadRequestException,
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
import { WeeklyDigestRequestSchema } from "@questorylabs/shared";

const SEARCH_DOMAINS = new Set(["games", "music", "watch", "read"]);
export const MAX_SEMANTIC_QUERY_CHARS = 200;

export function parseSemanticSearch(body: unknown): {
  q: string;
  domains: string[];
  limit: number;
} {
  const raw = (body ?? {}) as Record<string, unknown>;
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  if (!q) throw new BadRequestException("q is required");
  if (q.length > MAX_SEMANTIC_QUERY_CHARS) {
    throw new BadRequestException(`q must be at most ${MAX_SEMANTIC_QUERY_CHARS} characters`);
  }
  const domains = raw.domains ?? [];
  if (
    !Array.isArray(domains) ||
    domains.length > SEARCH_DOMAINS.size ||
    !domains.every((d) => typeof d === "string" && SEARCH_DOMAINS.has(d))
  ) {
    throw new BadRequestException("domains must be a subset of games, music, watch, read");
  }
  const limit = raw.limit ?? 20;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 40) {
    throw new BadRequestException("limit must be 1-40");
  }
  return { q, domains: domains as string[], limit };
}

@Controller("recommendations")
@UseGuards(SteamAuthGuard)
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
      body: withSessionUser(body, user.userId),
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

  @Get("history")
  async history(
    @CurrentUser() user: SessionUser,
    @Query("limit") limit?: string,
  ) {
    const n = Number.parseInt(limit ?? "3", 10);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      throw new BadRequestException("limit must be 1-10");
    }
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "GET",
      path: "/v1/recommendations/history",
      query: { limit: String(n) },
    });
  }

  @Post("search")
  async semanticSearch(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ) {
    const input = parseSemanticSearch(body);
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/search",
      body: input,
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

  @Post("weekly-digest/cache")
  async weeklyDigestCache(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ) {
    const parsed = WeeklyDigestRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/weekly-digest/cache",
      body: parsed.data,
    });
  }

  @Post("weekly-digest")
  async weeklyDigest(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = WeeklyDigestRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.rateLimit.assertAllowed(user.userId, "llm");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations/weekly-digest",
      body: parsed.data,
    });
  }
}

const withSessionUser = (body: unknown, userId: string) =>
  body && typeof body === "object" && !Array.isArray(body)
    ? { ...(body as Record<string, unknown>), userId }
    : { userId };
