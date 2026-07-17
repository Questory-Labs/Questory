import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  currencyFromCountry,
  isSupportedPriceCountry,
  normalizePriceCountry,
  PRICE_REGIONS,
} from "../lib/currency";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findBySteamId(steamId: string) {
    return this.prisma.user.findUnique({ where: { steamId } });
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
}
