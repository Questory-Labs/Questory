import { Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserSyncService } from "./user-sync.service";

@Controller("sync")
@UseGuards(SteamAuthGuard)
export class UserSyncController {
  constructor(private readonly userSync: UserSyncService) {}

  @Post("user")
  @HttpCode(202)
  request(@CurrentUser() user: { userId: string }) {
    return this.userSync.request(user.userId);
  }
}
