import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { signOAuthState, verifyOAuthState } from "@questorylabs/shared/oauth-state";
import { AnilistService } from "./anilist.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";
import { FeatureFlagsService } from "../../features/feature-flags.service";
import { listProviderConnectedUrl } from "../../features/list-provider-redirect";

@Controller("watch/anilist")
export class AnilistController {
  constructor(
    private readonly anilist: AnilistService,
    private readonly flags: FeatureFlagsService,
  ) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentWatchUserId() userId: string) {
    return this.anilist.getConnection(userId);
  }

  @Get("authorize")
  @UseGuards(SessionUserGuard)
  authorize(@Res() res: Response, @CurrentWatchUserId() userId: string) {
    const state = signOAuthState(userId);
    return res.redirect(this.anilist.authUrl(state));
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
    await this.anilist.exchangeCode(code, verified.userId);
    return res.redirect(await listProviderConnectedUrl(this.flags, "anilist"));
  }

}
