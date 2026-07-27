import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { Request } from "express";

function safeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = (process.env.CRON_SECRET || "").trim();
    if (!secret) {
      throw new UnauthorizedException("CRON_SECRET is not configured");
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const headerSecret = String(req.headers["x-cron-secret"] || "").trim();
    const provided = bearer || headerSecret;

    if (!provided || !safeStringEqual(provided, secret)) {
      throw new UnauthorizedException("Invalid cron secret");
    }
    return true;
  }
}
