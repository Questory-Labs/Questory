import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { ReadAuthedRequest } from "./session-user.guard";

export const CurrentReadUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<ReadAuthedRequest>();
    return req.readUserId as string;
  },
);
