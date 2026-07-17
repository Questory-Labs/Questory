import { Controller, Get, UseGuards } from "@nestjs/common";
import { TrendingService } from "./trending.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("trending")
@UseGuards(SteamAuthGuard)
export class TrendingController {
  constructor(private readonly trending: TrendingService) {}

  @Get()
  get(@CurrentUser() user: { userId: string }) {
    return this.trending.getTrending(user.userId);
  }

  @Get("friends")
  friends(@CurrentUser() user: { userId: string }) {
    return this.trending.getFriendsShelf(user.userId);
  }

  @Get("global")
  global() {
    return this.trending.getGlobalShelf();
  }

  @Get("concurrent")
  concurrent() {
    return this.trending.getConcurrentShelf();
  }

  @Get("deck")
  deck() {
    return this.trending.getDeckShelf();
  }

  @Get("top-releases")
  topReleases() {
    return this.trending.getTopReleasesShelf();
  }
}
