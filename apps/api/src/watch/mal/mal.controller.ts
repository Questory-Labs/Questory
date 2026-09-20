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
import { FeatureFlagsService } from "../../features/feature-flags.service";
import { listProviderConnectedUrl } from "../../features/list-provider-redirect";

@Controller("watch/mal")
export class MalController {
  constructor(
    private readonly mal: MalService,
    private readonly flags: FeatureFlagsService,
  ) {}

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
    return res.redirect(await listProviderConnectedUrl(this.flags, "mal"));
  }

}
