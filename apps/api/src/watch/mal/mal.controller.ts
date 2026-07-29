import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { Response } from "express";
import { MalService } from "./mal.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";

@Controller("watch/mal")
export class MalController {
  constructor(private readonly mal: MalService) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentWatchUserId() userId: string) {
    return this.mal.getConnection(userId);
  }

  @Get("authorize")
  @UseGuards(SessionUserGuard)
  authorize(@Res() res: Response, @CurrentWatchUserId() userId: string) {
    const { url } = this.mal.buildAuthState(userId);
    return res.redirect(url);
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code) return res.status(400).send("Missing code");
    await this.mal.exchangeCode(code, state);
    const web =
      process.env.WEB_ORIGIN ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${web.replace(/\/$/, "")}/watch/settings?mal=connected`,
    );
  }

}
