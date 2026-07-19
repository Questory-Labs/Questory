import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { allowsSoleUserFallback } from "../lib/runtime-config";
import { hashToken } from "../lib/tokens";

const WATCH_WEBHOOK = "watch_webhook";
const STEAM = "steam";

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultUser();
  }

  /** Ensure at least one shared User exists for self-host watch attach. */
  async ensureDefaultUser() {
    const count = await this.prisma.user.count();
    if (count > 0) return;

    await this.prisma.user.create({
      data: { personaName: "questory" },
    });
    this.logger.log("Created default shared user: questory");
  }

  /** Exactly one user — used for sole-user local/selfhosted fallback. */
  async resolveSoleUser() {
    if (!allowsSoleUserFallback()) return null;
    const users = await this.prisma.user.findMany({ take: 2 });
    if (users.length === 1) return users[0];
    return null;
  }

  /**
   * Resolve a user for authenticated / internal paths.
   * Arbitrary userId is only honored when the caller already authorized it
   * (session guard, signed OAuth state, or cron).
   */
  async resolveUser(userId?: string) {
    if (userId) {
      return this.prisma.user.findUnique({ where: { id: userId } });
    }

    const sole = await this.resolveSoleUser();
    if (sole) return sole;

    const steamAccounts = await this.prisma.account.findMany({
      where: { provider: STEAM },
      take: 2,
      include: { user: true },
    });
    if (steamAccounts.length === 1) return steamAccounts[0].user;

    return this.prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  }

  async findByWebhookToken(plainToken: string) {
    const tokenHash = hashToken(plainToken);
    const key = await this.prisma.apiKey.findFirst({
      where: {
        tokenHash,
        type: WATCH_WEBHOOK,
        revokedAt: null,
      },
      include: { user: true },
    });
    if (!key) return null;

    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return key.user;
  }
}
