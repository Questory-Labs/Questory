import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import {
  currencyFromCountry,
  isSupportedPriceCountry,
  normalizePriceCountry,
  PRICE_REGIONS,
} from "../lib/currency";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const steamId = await this.accounts.getSteamId(id);
    return { ...user, steamId };
  }

  findBySteamId(steamId: string) {
    return this.accounts.findUserBySteamId(steamId);
  }

  listPriceRegions() {
    return PRICE_REGIONS;
  }

  async updateProfile(
    userId: string,
    body: { countryCode?: string | null },
  ) {
    if (body.countryCode === undefined) {
      throw new BadRequestException("Nothing to update");
    }

    const raw = body.countryCode?.trim() || null;
    if (raw && !isSupportedPriceCountry(raw)) {
      throw new BadRequestException(
        "Unsupported price region. Pick a country from the list.",
      );
    }

    const countryCode = normalizePriceCountry(raw);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        countryCode,
        // User-chosen region should not be overwritten on Steam login.
        priceRegionLocked: countryCode != null,
      },
    });
    const steamId = await this.accounts.getSteamId(userId);

    return {
      user: {
        id: user.id,
        steamId,
        personaName: user.personaName,
        avatarUrl: user.avatarUrl,
        profileUrl: user.profileUrl,
        countryCode: user.countryCode,
        priceRegionLocked: user.priceRegionLocked,
        currency: currencyFromCountry(user.countryCode),
      },
    };
  }
}
