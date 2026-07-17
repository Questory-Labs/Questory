import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { currencyFromCountry } from "../lib/currency";

@Controller("users")
@UseGuards(SteamAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

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
}
