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
import { BangumiService } from "./bangumi.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";
import { FeatureFlagsService } from "../../features/feature-flags.service";
import { listProviderConnectedUrl } from "../../features/list-provider-redirect";

@Controller("watch/bangumi")
export class BangumiController {
  constructor(
    private readonly bangumi: BangumiService,
    private readonly flags: FeatureFlagsService,
  ) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentWatchUserId() userId: string) {
    return this.bangumi.getConnection(userId);
  }

  @Get("authorize")
  @UseGuards(SessionUserGuard)
  authorize(@Res() res: Response, @CurrentWatchUserId() userId: string) {
    const state = signOAuthState(userId);
    return res.redirect(this.bangumi.authUrl(state));
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
    await this.bangumi.exchangeCode(code, verified.userId);
    return res.redirect(await listProviderConnectedUrl(this.flags, "bangumi"));
  }

}
