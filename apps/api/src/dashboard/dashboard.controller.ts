import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { DashboardService } from "./dashboard.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  PLAY_NEXT_DEFAULT_LIMIT,
  PLAY_NEXT_MAX_LIMIT,
} from "./dashboard.constants";

const PlayNextLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(PLAY_NEXT_MAX_LIMIT);

@Controller("dashboard")
@UseGuards(SteamAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("stats")
  stats(@CurrentUser() user: { userId: string }) {
    return this.dashboard.getStats(user.userId);
  }

  @Get("play-next")
  playNext(
    @CurrentUser() user: { userId: string },
    @Query("limit") limitRaw?: string,
  ) {
    const parsed = PlayNextLimitSchema.safeParse(
      limitRaw == null || limitRaw === "" ? PLAY_NEXT_DEFAULT_LIMIT : limitRaw,
    );
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.dashboard.playNext(user.userId, parsed.data);
  }
}
