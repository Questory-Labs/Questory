import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { UsersService } from "../users/users.service";
import { hashToken } from "../lib/tokens";
import { extractToken } from "../listenbrainz/token.guard";
import { LB_NATIVE_DISABLED_ERROR } from "./scrobbler.constants";
import { ScrobblerConnections } from "./scrobbler.connections";

type LbRequest = Request & {
  musicUser?: { id: string; username: string };
  params?: { user?: string };
};

@Injectable()
export class ListenBrainzNativeMutexGuard implements CanActivate {
  constructor(
    private readonly connections: ScrobblerConnections,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<LbRequest>();
    const userId = await this.resolveUserId(req);
    if (!userId) return true;

    const native = await this.connections.hasNative(userId);
    if (!native) return true;

    throw new ForbiddenException({
      code: 403,
      error: LB_NATIVE_DISABLED_ERROR,
    });
  }

  private async resolveUserId(req: LbRequest): Promise<string | null> {
    if (req.musicUser?.id) return req.musicUser.id;

    const slug = req.params?.user;
    if (slug) {
      const user = await this.users.findByUsername(slug);
      return user?.id ?? null;
    }

    const token = extractToken(req);
    if (!token) return null;
    const user = await this.users.findByTokenHash(hashToken(token));
    return user?.id ?? null;
  }
}
