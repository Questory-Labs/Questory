import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DeleteAccountSchema } from "@questorylabs/shared";
import { UsersService } from "./users.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { currencyFromCountry } from "../lib/currency";
import { clearSession } from "../auth/session";
import { AuthAbuseService } from "../auth/abuse/auth-abuse.service";

@Controller("users")
@UseGuards(SteamAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly abuse: AuthAbuseService,
  ) {}

  @Get("me")
  async me(@CurrentUser() session: { userId: string }) {
    const user = await this.users.findById(session.userId);
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
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  @Get("price-regions")
  priceRegions() {
    return this.users.listPriceRegions();
  }

  @Patch("me")
  updateMe(
    @CurrentUser() session: { userId: string },
    @Body() body: { countryCode?: string | null },
  ) {
    return this.users.updateProfile(session.userId, body);
  }

  @Delete("me")
  @HttpCode(200)
  async deleteMe(
    @CurrentUser() session: { userId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    this.abuse.assertOriginAllowed(
      (req.headers.origin as string | undefined) ||
        (req.headers.referer as string | undefined),
    );
    const parsed = DeleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Type DELETE to confirm");
    }
    const result = await this.users.deleteAccount(session.userId);
    clearSession(res, req);
    return result;
  }
}
