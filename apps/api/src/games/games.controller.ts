import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { GamesService } from "./games.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("games")
@UseGuards(SteamAuthGuard)
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get(":appId")
  detail(
    @CurrentUser() user: { userId: string },
    @Param("appId", ParseIntPipe) appId: number,
  ) {
    return this.games.detail(user.userId, appId);
  }
}
