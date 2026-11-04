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
  async friends(@CurrentUser() user: { userId: string }) {
    return this.trending.withLibraryFlags(
      user.userId,
      await this.trending.getFriendsShelf(user.userId),
    );
  }

  @Get("global")
  async global(@CurrentUser() user: { userId: string }) {
    return this.trending.withLibraryFlags(
      user.userId,
      await this.trending.getGlobalShelf(),
    );
  }

  @Get("concurrent")
  async concurrent(@CurrentUser() user: { userId: string }) {
    return this.trending.withLibraryFlags(
      user.userId,
      await this.trending.getConcurrentShelf(),
    );
  }

  @Get("deck")
  async deck(@CurrentUser() user: { userId: string }) {
    return this.trending.withLibraryFlags(
      user.userId,
      await this.trending.getDeckShelf(),
    );
  }

  @Get("top-releases")
  async topReleases(@CurrentUser() user: { userId: string }) {
    return this.trending.withLibraryFlags(
      user.userId,
      await this.trending.getTopReleasesShelf(),
    );
  }
}
