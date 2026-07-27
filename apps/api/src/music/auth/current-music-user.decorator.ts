import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { MusicAuthedRequest } from "./session-user.guard";

export const CurrentMusicUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<MusicAuthedRequest>();
    return { userId: req.musicUserId as string };
  },
);
