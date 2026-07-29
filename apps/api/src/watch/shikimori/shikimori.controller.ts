import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { Response } from "express";
import { signOAuthState, verifyOAuthState } from "@questorylabs/shared/oauth-state";
import { ShikimoriService } from "./shikimori.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";

@Controller("watch/shikimori")
export class ShikimoriController {
  constructor(private readonly shikimori: ShikimoriService) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentWatchUserId() userId: string) {
    return this.shikimori.getConnection(userId);
  }

  @Get("authorize")
  @UseGuards(SessionUserGuard)
  authorize(@Res() res: Response, @CurrentWatchUserId() userId: string) {
    const state = signOAuthState(userId);
    return res.redirect(this.shikimori.authUrl(state));
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code) return res.status(400).send("Missing code");
    const verified = verifyOAuthState(state);
    if (!verified) {
      throw new BadRequestException("Invalid or expired OAuth state");
    }
    await this.shikimori.exchangeCode(code, verified.userId);
    const web =
      process.env.WEB_ORIGIN ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      "http://localhost:3000";
    return res.redirect(
      `${web.replace(/\/$/, "")}/watch/settings?shikimori=connected`,
    );
  }

}
