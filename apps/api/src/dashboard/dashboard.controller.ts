import { Controller, Get, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("dashboard")
@UseGuards(SteamAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("stats")
  stats(@CurrentUser() user: { userId: string }) {
    return this.dashboard.getStats(user.userId);
  }

  @Get("play-next")
  playNext(@CurrentUser() user: { userId: string }) {
    return this.dashboard.playNext(user.userId);
  }
}
