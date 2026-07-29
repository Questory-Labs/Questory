import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { MalService } from "../../watch/mal/mal.service";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { CurrentReadUserId } from "../auth/current-read-user.decorator";

@Controller("read/mal")
export class ReadMalController {
  constructor(private readonly mal: MalService) {}

  @Get("status")
  @UseGuards(ReadSessionUserGuard)
  status(@CurrentReadUserId() userId: string) {
    return this.mal.getConnection(userId);
  }

  @Get("authorize")
  @UseGuards(ReadSessionUserGuard)
  authorize(@Res() res: Response, @CurrentReadUserId() userId: string) {
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
      `${web.replace(/\/$/, "")}/read/settings?mal=connected`,
    );
  }

}
