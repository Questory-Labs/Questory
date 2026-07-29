import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { KitsuService } from "../../watch/kitsu/kitsu.service";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { CurrentReadUserId } from "../auth/current-read-user.decorator";

@Controller("read/kitsu")
export class ReadKitsuController {
  constructor(private readonly kitsu: KitsuService) {}

  @Get("status")
  @UseGuards(ReadSessionUserGuard)
  status(@CurrentReadUserId() userId: string) {
    return this.kitsu.getConnection(userId);
  }

  @Post("connect")
  @UseGuards(ReadSessionUserGuard)
  connect(
    @CurrentReadUserId() userId: string,
    @Body() body: { email?: string; password?: string },
  ) {
    return this.kitsu.connect(body.email ?? "", body.password ?? "", userId);
  }

}
