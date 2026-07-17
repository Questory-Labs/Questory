import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("friends")
@UseGuards(SteamAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.friends.list(user.userId);
  }

  @Get(":steamId/compare")
  compare(
    @CurrentUser() user: { userId: string },
    @Param("steamId") steamId: string,
  ) {
    return this.friends.compare(user.userId, steamId);
  }
}
