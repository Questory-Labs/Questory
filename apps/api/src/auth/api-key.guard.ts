import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import {
  PUBLIC_API_RATE_LIMIT,
  PublicApiScopeSchema,
  type PublicApiScope,
} from "@questorylabs/shared";
import { API_KEY_TYPE } from "../accounts/account.constants";
import { hashApiToken } from "../accounts/accounts.service";
import { CacheService } from "../cache/cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { PUBLIC_API_SCOPES_KEY } from "./scopes.decorator";

export type ApiKeyRequest = Request & {
  userId: string;
  apiKeyId: string;
  apiKeyScopes: PublicApiScope[];
};

const LAST_USED_TTL_SECONDS = 60;

export function parseApiKeyScopes(raw: string | null | undefined): PublicApiScope[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is PublicApiScope => PublicApiScopeSchema.safeParse(s).success,
    );
  } catch {
    return [];
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !value?.trim()) return null;
  return value.trim();
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<ApiKeyRequest>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const token = bearerToken(req);
    if (!token) throw new UnauthorizedException("Missing API key");

    const key = await this.prisma.apiKey.findFirst({
      where: { tokenHash: hashApiToken(token), revokedAt: null },
      select: { id: true, userId: true, type: true, scopes: true },
    });
    if (!key || key.type !== API_KEY_TYPE.public) {
      throw new UnauthorizedException("Invalid API key");
    }

    const hits = await this.cache.incr(
      `public-api:rl:${key.id}`,
      PUBLIC_API_RATE_LIMIT.ttl,
    );
    if (hits > PUBLIC_API_RATE_LIMIT.max) {
      res.setHeader("Retry-After", String(PUBLIC_API_RATE_LIMIT.ttl));
      throw new HttpException("Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    }

    const scopes = parseApiKeyScopes(key.scopes);
    const required =
      this.reflector.getAllAndOverride<PublicApiScope[] | undefined>(
        PUBLIC_API_SCOPES_KEY,
        [ctx.getHandler(), ctx.getClass()],
      ) ?? [];
    const missing = required.filter((s) => !scopes.includes(s));
    if (missing.length) {
      throw new ForbiddenException(`Missing scope: ${missing.join(", ")}`);
    }

    req.userId = key.userId;
    req.apiKeyId = key.id;
    req.apiKeyScopes = scopes;

    await this.touchLastUsed(key.id);
    return true;
  }

  private async touchLastUsed(id: string) {
    const cacheKey = `public-api:last-used:${id}`;
    if (await this.cache.getString(cacheKey)) return;
    await this.cache.setString(cacheKey, "1", LAST_USED_TTL_SECONDS);
    await this.prisma.apiKey
      .update({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }
}
