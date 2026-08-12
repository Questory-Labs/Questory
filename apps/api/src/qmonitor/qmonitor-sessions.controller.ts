import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PLAY_SESSIONS_PAGE_SIZE } from "./qmonitor.constants";
import { QmonitorSessionsService } from "./qmonitor-sessions.service";

@Controller("play-sessions")
@UseGuards(SteamAuthGuard)
export class QmonitorSessionsController {
  constructor(private readonly sessions: QmonitorSessionsService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(pageSizeRaw, PLAY_SESSIONS_PAGE_SIZE);
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.sessions.list(user.userId, page, pageSize);
  }
}
