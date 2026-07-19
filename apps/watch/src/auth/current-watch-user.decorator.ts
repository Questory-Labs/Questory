import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { WatchAuthedRequest } from "./session-user.guard";

export const CurrentWatchUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<WatchAuthedRequest>();
    return req.watchUserId as string;
  },
);
