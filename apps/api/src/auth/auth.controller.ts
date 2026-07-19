import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { clearSession, readSession, setSession } from "./session";
import { SteamAuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { openIdQueryFromRequest } from "./openid-query";
import { currencyFromCountry } from "../lib/currency";
import { isSteamIdAllowed } from "../lib/runtime-config";

@Controller({ path: "auth", version: VERSION_NEUTRAL })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("steam")
  steamLogin(@Res() res: Response) {
    return res.redirect(this.auth.buildSteamLoginUrl());
  }

  @Get("steam/callback")
  async steamCallback(@Req() req: Request, @Res() res: Response) {
    const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000";
    try {
      const query = openIdQueryFromRequest(req);
      const steamId = await this.auth.verifySteamOpenId(query);
      if (!isSteamIdAllowed(steamId)) {
        return res.redirect(
          `${webOrigin}/?error=${encodeURIComponent("not_allowed")}`,
        );
      }
      const user = await this.auth.upsertFromSteam(steamId);
      setSession(res, {
        userId: user.id,
        steamId: user.steamId,
      });
      return res.redirect(`${webOrigin}/dashboard`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "auth_failed";
      return res.redirect(
        `${webOrigin}/?error=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get("me")
  async me(@Req() req: Request) {
    const session = readSession(req);
    if (!session) return { user: null };
    const user = await this.auth.getUser(session.userId);
    if (!user) return { user: null };
    return {
      user: {
        id: user.id,
        steamId: user.steamId,
        personaName: user.personaName,
        avatarUrl: user.avatarUrl,
        profileUrl: user.profileUrl,
        countryCode: user.countryCode,
        priceRegionLocked: user.priceRegionLocked,
        currency: currencyFromCountry(user.countryCode),
      },
    };
  }

  @Post("logout")
  @UseGuards(SteamAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    clearSession(res);
    return { ok: true };
  }

  @Get("session-check")
  @UseGuards(SteamAuthGuard)
  sessionCheck(@CurrentUser() user: { userId: string; steamId: string }) {
    return user;
  }
}
