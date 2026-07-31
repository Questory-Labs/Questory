import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AccountsService } from "../accounts/accounts.service";
import { SyncService } from "../sync/sync.service";
import {
  currencyFromCountry,
  isSupportedPriceCountry,
  normalizePriceCountry,
  PRICE_REGIONS,
} from "../lib/currency";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    @Inject(forwardRef(() => SyncService))
    private readonly sync: SyncService,
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
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    });
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        countryCode,
        // User-chosen region should not be overwritten on Steam login.
        priceRegionLocked: countryCode != null,
      },
    });
    if (previous?.countryCode !== user.countryCode) {
      void this.sync.syncLibraryPrices(userId, 120).catch((err) => {
        this.logger.warn(
          `Price re-sync after region change failed for ${userId}: ${err}`,
        );
      });
    }
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
