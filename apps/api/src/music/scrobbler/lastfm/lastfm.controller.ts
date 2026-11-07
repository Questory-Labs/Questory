import {
  Controller,
  Delete,
  Get,
  Logger,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { SessionUserGuard } from "../../auth/session-user.guard";
import { CurrentMusicUser } from "../../auth/current-music-user.decorator";
import { LastFmAuth } from "./lastfm.auth";

function webOrigin(): string {
  return (
    process.env.WEB_ORIGIN ||
    process.env.NEXT_PUBLIC_WEB_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

@Controller("music/scrobbler/lastfm")
export class LastFmController {
  private readonly logger = new Logger(LastFmController.name);

  constructor(private readonly lastfm: LastFmAuth) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentMusicUser() user: { userId: string }) {
    return this.lastfm.status(user.userId);
  }

  @Get("authorize")
  @UseGuards(SessionUserGuard)
  async authorize(
    @Res() res: Response,
    @CurrentMusicUser() user: { userId: string },
  ) {
    const url = await this.lastfm.authorizeUrl(user.userId);
    return res.redirect(url);
  }

  @Get("callback")
  async callback(
    @Query("token") token: string | undefined,
    @Res() res: Response,
  ) {
    const web = webOrigin();
    const fail = (reason: string) =>
      res.redirect(
        `${web}/sources?tab=music&lastfm=error&reason=${encodeURIComponent(reason)}`,
      );

    if (!token) return fail("missing_token");

    try {
      const userId = await this.lastfm.resolveUserIdFromToken(token);
      if (!userId) return fail("invalid_state");
      await this.lastfm.complete(token, userId);
    } catch (err) {
      this.logger.warn(
        `Last.fm callback failed: ${err instanceof Error ? err.name : "unknown"}`,
      );
      return fail("callback_failed");
    }
    return res.redirect(`${web}/sources?tab=music&lastfm=connected`);
  }

  @Delete()
  @UseGuards(SessionUserGuard)
  disconnect(@CurrentMusicUser() user: { userId: string }) {
    return this.lastfm.disconnect(user.userId);
  }
}
