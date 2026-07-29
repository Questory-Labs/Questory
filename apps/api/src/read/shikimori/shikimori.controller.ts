import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  signOAuthState,
  verifyOAuthState,
} from "@questorylabs/shared/oauth-state";
import { ShikimoriService } from "../../watch/shikimori/shikimori.service";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { CurrentReadUserId } from "../auth/current-read-user.decorator";

@Controller("read/shikimori")
export class ReadShikimoriController {
  constructor(private readonly shikimori: ShikimoriService) {}

  @Get("status")
  @UseGuards(ReadSessionUserGuard)
  status(@CurrentReadUserId() userId: string) {
    return this.shikimori.getConnection(userId);
  }

  @Get("authorize")
  @UseGuards(ReadSessionUserGuard)
  authorize(@Res() res: Response, @CurrentReadUserId() userId: string) {
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
      `${web.replace(/\/$/, "")}/read/settings?shikimori=connected`,
    );
  }

}
