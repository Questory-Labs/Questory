import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionUserGuard } from "../watch/auth/session-user.guard";
import { CurrentWatchUserId } from "../watch/auth/current-watch-user.decorator";
import { SourcesService } from "./sources.service";

@Controller("sources")
@UseGuards(SessionUserGuard)
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Get()
  overview(@CurrentWatchUserId() userId: string) {
    return this.sources.overview(userId);
  }
}
