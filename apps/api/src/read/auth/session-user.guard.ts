import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  SESSION_COOKIE_NAME,
  parseSessionCookie,
} from "@questorylabs/shared/session";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../../watch/users/users.service";
import { allowsSoleUserFallback } from "../../watch/lib/runtime-config";
import { loadLiveSessionUser } from "../../auth/session-user";

export type ReadAuthedRequest = Request & {
  readUserId?: string;
};

@Injectable()
export class ReadSessionUserGuard implements CanActivate {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ReadAuthedRequest>();
    const raw = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const session = parseSessionCookie(raw);
    const queryUserId =
      typeof req.query?.userId === "string" ? req.query.userId.trim() : "";

    if (session) {
      if (queryUserId && queryUserId !== session.userId) {
        throw new ForbiddenException("userId does not match session");
      }
      const user = await loadLiveSessionUser(this.prisma, session);
      req.readUserId = user.id;
      return true;
    }

    if (allowsSoleUserFallback() && !queryUserId) {
      const sole = await this.users.resolveSoleUser();
      if (sole) {
        req.readUserId = sole.id;
        return true;
      }
    }

    throw new UnauthorizedException("Not authenticated");
  }
}
