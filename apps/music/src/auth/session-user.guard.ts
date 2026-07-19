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
import { UsersService } from "../users/users.service";
import { resolveAppMode } from "../lib/runtime-config";

export type MusicAuthedRequest = Request & {
  musicUserId?: string;
};

@Injectable()
export class SessionUserGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MusicAuthedRequest>();
    const raw = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const session = parseSessionCookie(raw);

    if (session) {
      req.musicUserId = session.userId;
      return true;
    }

    const mode = resolveAppMode();
    if (mode === "local" || mode === "selfhosted") {
      const sole = await this.users.resolveSoleUser();
      if (sole) {
        req.musicUserId = sole.id;
        return true;
      }
    }

    throw new UnauthorizedException("Not authenticated");
  }
}
