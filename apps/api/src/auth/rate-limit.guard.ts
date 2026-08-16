import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { CacheService } from "../cache/cache.service";
import { clientIpFromRequest } from "./abuse/client-ip";
import { readSession } from "./session";

const SKIP_PREFIXES = ["/health", "/api/health"];
const AUTH_PREFIX = "/auth";
const AUTH_LIMIT = { max: 40, ttl: 60 };
const GLOBAL_LIMIT = { max: 300, ttl: 60 };

function requestPath(req: Request): string {
  const raw = req.originalUrl || req.url || "";
  return raw.split("?")[0] || "/";
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly cache: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const path = requestPath(req);
    if (SKIP_PREFIXES.some((p) => matchesPrefix(path, p))) return true;

    const ip = clientIpFromRequest(req);
    const session = readSession(req);
    const scope = matchesPrefix(path, AUTH_PREFIX) ? "auth" : "global";
    const limit = scope === "auth" ? AUTH_LIMIT : GLOBAL_LIMIT;
    const id = session?.userId ? `u:${session.userId}` : `ip:${ip}`;
    const key = `rl:${scope}:${id}`;
    const count = await this.cache.incr(key, limit.ttl);
    if (count > limit.max) {
      throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
