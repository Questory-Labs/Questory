import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { readSession } from "./session";
import { loadLiveSessionUser } from "./session-user";

export type SessionUser = {
  userId: string;
  steamId: string | null;
};

@Injectable()
export class SteamAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = readSession(req);
    if (!session) throw new UnauthorizedException("Not authenticated");
    const user = await loadLiveSessionUser(this.prisma, session);
    const authed = req as Request & SessionUser;
    authed.userId = user.id;
    authed.steamId = session.steamId;
    return true;
  }
}
