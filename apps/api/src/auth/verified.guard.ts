import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { isMailerActive } from "../mail/smtp-config";
import { isEmailVerificationRequired } from "./verify-policy";
import { readSession } from "./session";
import { loadLiveSessionUser } from "./session-user";

const SKIP_PREFIXES = [
  "/auth",
  "/health",
  "/api/health",
  "/webhooks",
  "/oauth",
  "/1",
];

function requestPath(req: Request): string {
  const raw = req.originalUrl || req.url || "";
  return raw.split("?")[0] || "/";
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const path = requestPath(req);
    if (SKIP_PREFIXES.some((p) => matchesPrefix(path, p))) return true;
    if (!isMailerActive()) return true;
    if (!(await isEmailVerificationRequired(this.prisma))) return true;

    const session = readSession(req);
    if (!session) return true;

    const user = await loadLiveSessionUser(this.prisma, session);
    if (user.emailVerifiedAt) return true;

    throw new ForbiddenException({
      code: "email_unverified",
      message: "Email verification required",
    });
  }
}
