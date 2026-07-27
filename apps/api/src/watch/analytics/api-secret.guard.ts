import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  isApiSecretRequired,
  resolveWatchApiSecret,
} from "../lib/runtime-config";
import { safeEqual } from "../lib/tokens";

@Injectable()
export class ApiSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isApiSecretRequired()) return true;
    const secret = resolveWatchApiSecret();
    if (!secret) {
      throw new UnauthorizedException("WATCH_API_SECRET not configured");
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization || "";
    const bearer = /^Bearer\s+(.+)$/i.exec(header)?.[1];
    const token =
      bearer ||
      (typeof req.headers["x-watch-api-secret"] === "string"
        ? req.headers["x-watch-api-secret"]
        : "");
    if (!token || !safeEqual(token, secret)) {
      throw new UnauthorizedException("Invalid API secret");
    }
    return true;
  }
}
