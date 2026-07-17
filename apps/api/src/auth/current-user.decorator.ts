import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<
      Request & { userId: string; steamId: string }
    >();
    return { userId: req.userId, steamId: req.steamId };
  },
);
