import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  SESSION_COOKIE_NAME,
  parseSessionCookie,
} from "@questorylabs/shared/session";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { allowsSoleUserFallback } from "../../lib/runtime-config";
import { loadLiveSessionUser } from "../../auth/session-user";

export type MusicAuthedRequest = Request & {
  musicUserId?: string;
};

@Injectable()
export class SessionUserGuard implements CanActivate {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MusicAuthedRequest>();
    const raw = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const session = parseSessionCookie(raw);

    if (session) {
      const user = await loadLiveSessionUser(this.prisma, session);
      req.musicUserId = user.id;
      return true;
    }

    if (allowsSoleUserFallback()) {
      const sole = await this.users.resolveSoleUser();
      if (sole) {
        req.musicUserId = sole.id;
        return true;
      }
    }

    throw new UnauthorizedException("Not authenticated");
  }
}
