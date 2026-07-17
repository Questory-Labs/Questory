import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { readSession } from "./session";

@Injectable()
export class SteamAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const session = readSession(req);
    if (!session) throw new UnauthorizedException("Not authenticated");
    (req as Request & { userId: string; steamId: string }).userId =
      session.userId;
    (req as Request & { userId: string; steamId: string }).steamId =
      session.steamId;
    return true;
  }
}
