import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionUserGuard } from "../auth/session-user.guard";
import { WatchTrendingService } from "./trending.service";

@Controller("watch/trending")
@UseGuards(SessionUserGuard)
export class WatchTrendingController {
  constructor(private readonly trending: WatchTrendingService) {}

  @Get("tmdb")
  tmdb() {
    return this.trending.tmdbWeek();
  }
}
