import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import { FriendsService } from "./friends.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { FRIENDS_PAGE_SIZE } from "./friends.constants";

@Controller("friends")
@UseGuards(SteamAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(pageSizeRaw, FRIENDS_PAGE_SIZE);
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.friends.list(user.userId, { page, pageSize });
  }

  @Get(":steamId/compare")
  compare(
    @CurrentUser() user: { userId: string },
    @Param("steamId") steamId: string,
  ) {
    return this.friends.compare(user.userId, steamId);
  }
}
