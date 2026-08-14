import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  parsePageParam,
  parsePageSizeParam,
  PlaySessionAssignSchema,
} from "@questorylabs/shared";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PLAY_SESSIONS_PAGE_SIZE } from "./qmonitor.constants";
import { QmonitorSessionRulesService } from "./qmonitor-session-rules.service";
import { QmonitorSessionsService } from "./qmonitor-sessions.service";

@Controller("play-sessions")
@UseGuards(SteamAuthGuard)
export class QmonitorSessionsController {
  constructor(
    private readonly sessions: QmonitorSessionsService,
    private readonly rules: QmonitorSessionRulesService,
  ) {}

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

  @Get("game-suggest")
  suggest(
    @CurrentUser() user: { userId: string },
    @Query("q") qRaw?: string,
  ) {
    const q = typeof qRaw === "string" ? qRaw : "";
    return this.rules.suggestLibraryGames(user.userId, q);
  }

  @Get(":id/similar")
  similar(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.rules.similar(user.userId, id);
  }

  @Post(":id/assign")
  assign(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = PlaySessionAssignSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.rules.assign(user.userId, id, parsed.data.gameId);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.sessions.remove(user.userId, id);
  }
}
