import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { KitsuService } from "./kitsu.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";

@Controller("watch/kitsu")
export class KitsuController {
  constructor(private readonly kitsu: KitsuService) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentWatchUserId() userId: string) {
    return this.kitsu.getConnection(userId);
  }

  @Post("connect")
  @UseGuards(SessionUserGuard)
  connect(
    @CurrentWatchUserId() userId: string,
    @Body() body: { email?: string; password?: string },
  ) {
    return this.kitsu.connect(body.email ?? "", body.password ?? "", userId);
  }

}
