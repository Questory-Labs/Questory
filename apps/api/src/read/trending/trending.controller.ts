import { Controller, Get, UseGuards } from "@nestjs/common";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { ReadTrendingService } from "./trending.service";

@Controller("read/trending")
@UseGuards(ReadSessionUserGuard)
export class ReadTrendingController {
  constructor(private readonly trending: ReadTrendingService) {}

  @Get("anilist")
  anilist() {
    return this.trending.anilistNow();
  }
}
