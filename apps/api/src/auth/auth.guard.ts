import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { readSession } from "./session";

export type SessionUser = {
  userId: string;
  steamId: string | null;
};

@Injectable()
export class SteamAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const session = readSession(req);
    if (!session) throw new UnauthorizedException("Not authenticated");
    const authed = req as Request & SessionUser;
    authed.userId = session.userId;
    authed.steamId = session.steamId;
    return true;
  }
}
