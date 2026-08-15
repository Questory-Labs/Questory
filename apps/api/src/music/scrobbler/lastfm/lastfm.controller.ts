import {
  Controller,
  Delete,
  Get,
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
        `${web}/music/settings?lastfm=error&reason=${encodeURIComponent(reason)}`,
      );

    if (!token) return fail("missing_token");

    const userId = await this.lastfm.resolveUserIdFromToken(token);
    if (!userId) return fail("invalid_state");

    try {
      await this.lastfm.complete(token, userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "callback_failed";
      return fail(message);
    }
    return res.redirect(`${web}/music/settings?lastfm=connected`);
  }

  @Delete()
  @UseGuards(SessionUserGuard)
  disconnect(@CurrentMusicUser() user: { userId: string }) {
    return this.lastfm.disconnect(user.userId);
  }
}
