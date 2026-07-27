import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { SessionUser } from "./auth.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const req = ctx.switchToHttp().getRequest<Request & SessionUser>();
    return { userId: req.userId, steamId: req.steamId ?? null };
  },
);
