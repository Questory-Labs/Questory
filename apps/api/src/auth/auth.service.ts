import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SteamApiService } from "../steam/steam-api.service";
import { SyncService } from "../sync/sync.service";
import { AccountsService } from "../accounts/accounts.service";
import { ACCOUNT_PROVIDER } from "../accounts/account.constants";
import { extractSteamId } from "./openid-query";
import { isAdminEmail, isEffectiveAdmin } from "./admin-emails";
import { hashPassword, verifyPassword, dummyPasswordVerify } from "./password";
import {
  allowEmailPlus,
  isDisposableEmailDomain,
  normalizeEmail,
} from "./abuse/disposable-emails";
import { isSignupOpen } from "./signup-policy";

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
    const realm = process.env.STEAM_REALM || new URL(returnTo).origin;

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

  /** Link Steam to an existing session user. Never creates users. */
  async linkSteamToUser(userId: string, steamId: string) {
    const [summary] = await this.steam.getPlayerSummaries([steamId]);
    const linked = await this.accounts.findByProviderAccount(
      ACCOUNT_PROVIDER.steam,
      steamId,
    );
    if (linked && linked.userId !== userId) {
      throw new ConflictException("Steam account already linked to another user");
    }

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new UnauthorizedException("Not authenticated");

    const user = await this.prisma.user.update({
      where: { id: userId },
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

    if (!linked) {
      try {
        await this.sync.enqueueAll(user.id, steamId);
      } catch (err) {
        this.logger.warn(
          `Sync enqueue after Steam link failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return { ...user, steamId };
  }

  async getSignupStatus() {
    const open = await isSignupOpen(this.prisma);
    const adminCount = await this.prisma.user.count({ where: { isAdmin: true } });
    return {
      open,
      reason:
        adminCount === 0
          ? "no_admins"
          : open
            ? "enabled"
            : "disabled",
    };
  }

  async register(emailRaw: string, password: string) {
    const open = await isSignupOpen(this.prisma);
    if (!open) {
      throw new ForbiddenException("Unable to create account");
    }

    const email = normalizeEmail(emailRaw);
    if (!email.includes("@") || email.length > 254) {
      throw new BadRequestException("Unable to create account");
    }
    if (!allowEmailPlus() && email.includes("+")) {
      throw new BadRequestException("Unable to create account");
    }
    if (isDisposableEmailDomain(email)) {
      throw new BadRequestException("Unable to create account");
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Unable to create account");
    }

    const passwordHash = await hashPassword(password);
    const local = email.split("@")[0] || "user";
    const personaName = local.slice(0, 64);
    const isAdmin = isAdminEmail(email);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        isAdmin,
        personaName,
      },
    });

    const steamId = await this.accounts.getSteamId(user.id);
    return { ...user, steamId };
  }

  async login(emailRaw: string, password: string) {
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      await dummyPasswordVerify(password);
      throw new UnauthorizedException("Invalid email or password");
    }

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Backfill isAdmin when email enters ADMIN_EMAILS
    if (!user.isAdmin && isAdminEmail(email)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
      user.isAdmin = true;
    }

    const steamId = await this.accounts.getSteamId(user.id);
    return { ...user, steamId };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const steamId = await this.accounts.getSteamId(userId);
    return { ...user, steamId };
  }

  toPublicUser(user: {
    id: string;
    email?: string | null;
    isAdmin?: boolean;
    passwordHash?: string | null;
    personaName: string;
    avatarUrl?: string | null;
    profileUrl?: string | null;
    countryCode?: string | null;
    priceRegionLocked?: boolean;
    steamId?: string | null;
  }) {
    return {
      id: user.id,
      steamId: user.steamId ?? null,
      email: user.email ?? null,
      isAdmin: isEffectiveAdmin(user),
      hasPassword: Boolean(user.passwordHash),
      personaName: user.personaName,
      avatarUrl: user.avatarUrl ?? null,
      profileUrl: user.profileUrl ?? null,
      countryCode: user.countryCode ?? null,
      priceRegionLocked: user.priceRegionLocked ?? false,
    };
  }
}
