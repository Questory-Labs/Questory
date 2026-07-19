import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ACCOUNT_PROVIDER, type AccountProvider } from "./account.constants";

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findByProviderAccount(provider: AccountProvider, providerAccountId: string) {
    return this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      include: { user: true },
    });
  }

  findUserBySteamId(steamId: string) {
    return this.findByProviderAccount(ACCOUNT_PROVIDER.steam, steamId).then(
      (a) => a?.user ?? null,
    );
  }

  async getSteamId(userId: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId, provider: ACCOUNT_PROVIDER.steam },
      select: { providerAccountId: true },
    });
    return account?.providerAccountId ?? null;
  }

  async getListenbrainzUsername(userId: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId, provider: ACCOUNT_PROVIDER.listenbrainz },
      select: { providerAccountId: true },
    });
    return account?.providerAccountId ?? null;
  }

  listForUser(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { provider: "asc" },
    });
  }

  async ensureSteamAccount(
    userId: string,
    steamId: string,
    displayName?: string | null,
  ) {
    return this.prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: ACCOUNT_PROVIDER.steam,
          providerAccountId: steamId,
        },
      },
      create: {
        userId,
        provider: ACCOUNT_PROVIDER.steam,
        providerAccountId: steamId,
        displayName: displayName ?? null,
      },
      update: {
        userId,
        ...(displayName ? { displayName } : {}),
      },
    });
  }

  /** Stable ListenBrainz-compatible username for public LB routes. */
  async ensureListenbrainzAccount(userId: string, personaName: string) {
    const existing = await this.prisma.account.findFirst({
      where: { userId, provider: ACCOUNT_PROVIDER.listenbrainz },
    });
    if (existing) return existing;

    const base = slugifyUsername(personaName) || `user-${userId.slice(-6)}`;
    let candidate = base;
    for (let i = 0; i < 8; i++) {
      const clash = await this.prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: ACCOUNT_PROVIDER.listenbrainz,
            providerAccountId: candidate,
          },
        },
      });
      if (!clash) {
        return this.prisma.account.create({
          data: {
            userId,
            provider: ACCOUNT_PROVIDER.listenbrainz,
            providerAccountId: candidate,
            displayName: personaName,
          },
        });
      }
      candidate = `${base}-${randomBytes(2).toString("hex")}`;
    }
    candidate = `user-${userId.replace(/[^a-z0-9]/gi, "").slice(-10)}`;
    return this.prisma.account.create({
      data: {
        userId,
        provider: ACCOUNT_PROVIDER.listenbrainz,
        providerAccountId: candidate,
        displayName: personaName,
      },
    });
  }
}

export function slugifyUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateApiToken(): { token: string; prefix: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    prefix: token.slice(0, 8),
    hash: hashApiToken(token),
  };
}
