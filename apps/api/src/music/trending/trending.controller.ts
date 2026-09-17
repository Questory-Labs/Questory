import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionUserGuard } from "../auth/session-user.guard";
import { MusicTrendingService } from "./trending.service";

@Controller("music/trending")
@UseGuards(SessionUserGuard)
export class MusicTrendingController {
  constructor(private readonly trending: MusicTrendingService) {}

  @Get("sitewide")
  sitewide() {
    return this.trending.sitewide();
  }
}
