import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SteamApiService } from "../steam/steam-api.service";
import { SyncService } from "../sync/sync.service";
import { AccountsService } from "../accounts/accounts.service";
import { ACCOUNT_PROVIDER } from "../accounts/account.constants";
import { extractSteamId } from "./openid-query";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly accounts: AccountsService,
    @Inject(forwardRef(() => SyncService))
    private readonly sync: SyncService,
  ) {}

  buildSteamLoginUrl() {
    const returnTo =
      process.env.STEAM_RETURN_URL ||
      "http://localhost:4000/auth/steam/callback";
    // Steam requires return_to to be under realm
    const realm =
      process.env.STEAM_REALM ||
      new URL(returnTo).origin;

    const params = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": returnTo,
      "openid.realm": realm,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });
    return `https://steamcommunity.com/openid/login?${params.toString()}`;
  }

  async verifySteamOpenId(query: Record<string, string>): Promise<string> {
    const claimed =
      query["openid.claimed_id"] || query["openid.identity"] || "";
    const steamId = extractSteamId(claimed);
    if (!steamId) {
      this.logger.warn(
        `Invalid claimed_id. keys=${Object.keys(query).join(",")} claimed=${claimed}`,
      );
      throw new Error("Invalid Steam OpenID claimed_id");
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.set(key, value);
    }
    params.set("openid.mode", "check_authentication");

    const res = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const text = await res.text();
    if (!text.includes("is_valid:true")) {
      this.logger.warn(`Steam OpenID verify failed: ${text.slice(0, 300)}`);
      throw new Error("Steam OpenID verification failed");
    }
    return steamId;
  }

  async upsertFromSteam(steamId: string) {
    const [summary] = await this.steam.getPlayerSummaries([steamId]);
    const linked = await this.accounts.findByProviderAccount(
      ACCOUNT_PROVIDER.steam,
      steamId,
    );
    const existing = linked?.user ?? null;
    const personaName =
      summary?.personaname ||
      existing?.personaName ||
      `Steam ${steamId}`;

    let user;
    if (existing) {
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(summary?.personaname ? { personaName: summary.personaname } : {}),
          ...(summary?.avatarfull ? { avatarUrl: summary.avatarfull } : {}),
          ...(summary?.profileurl ? { profileUrl: summary.profileurl } : {}),
          ...(summary?.loccountrycode && !existing.priceRegionLocked
            ? { countryCode: summary.loccountrycode }
            : {}),
        },
      });
      await this.accounts.ensureSteamAccount(
        user.id,
        steamId,
        summary?.personaname || user.personaName,
      );
    } else {
      user = await this.prisma.user.create({
        data: {
          personaName,
          avatarUrl: summary?.avatarfull || null,
          profileUrl: summary?.profileurl || null,
          countryCode: summary?.loccountrycode || null,
          accounts: {
            create: {
              provider: ACCOUNT_PROVIDER.steam,
              providerAccountId: steamId,
              displayName: personaName,
            },
          },
        },
      });
    }

    await this.sync.enqueueAll(user.id, steamId);
    return { ...user, steamId };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const steamId = await this.accounts.getSteamId(userId);
    return { ...user, steamId };
  }
}
