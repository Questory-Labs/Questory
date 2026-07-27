import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { readSession } from "./session";
import { isEffectiveAdmin } from "./admin-emails";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = readSession(req);
    if (!session) throw new UnauthorizedException("Not authenticated");

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, isAdmin: true },
    });
    if (!user) throw new UnauthorizedException("Not authenticated");

    if (!isEffectiveAdmin(user)) {
      throw new ForbiddenException("Admin access required");
    }

    // Persist ADMIN_EMAILS grant
    if (!user.isAdmin && isEffectiveAdmin(user)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    (req as Request & { userId: string; steamId: string | null }).userId =
      session.userId;
    (req as Request & { userId: string; steamId: string | null }).steamId =
      session.steamId;
    (req as Request & { isAdmin: boolean }).isAdmin = true;
    return true;
  }
}
