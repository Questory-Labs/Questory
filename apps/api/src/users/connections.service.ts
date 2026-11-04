import { Injectable } from "@nestjs/common";
import type { ConnectionsOverview, SourceDomain } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SOURCE_DOMAIN_PROVIDERS } from "../sources/sources.constants";
import { CONNECTIONS_ROW_LIMIT } from "./connections.constants";

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string): Promise<ConnectionsOverview> {
    const [accounts, connections, apiKeys, qmonitorDeviceCount, user] =
      await Promise.all([
        this.prisma.account.findMany({
          where: { userId },
          select: {
            provider: true,
            providerAccountId: true,
            displayName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: CONNECTIONS_ROW_LIMIT,
        }),
        this.prisma.sourceConnection.findMany({
          where: { userId },
          select: {
            id: true,
            provider: true,
            lastSyncedAt: true,
            lastError: true,
          },
          orderBy: { createdAt: "asc" },
          take: CONNECTIONS_ROW_LIMIT,
        }),
        this.prisma.apiKey.findMany({
          where: { userId, revokedAt: null },
          select: {
            id: true,
            type: true,
            tokenPrefix: true,
            label: true,
            lastUsedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: CONNECTIONS_ROW_LIMIT,
        }),
        this.prisma.qmonitorDeviceSession.count({
          where: { userId, revokedAt: null },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { lastSyncedAt: true },
        }),
      ]);

    const domains = Object.keys(SOURCE_DOMAIN_PROVIDERS) as SourceDomain[];
    const sources = connections.flatMap((c) =>
      domains
        .filter((domain) =>
          SOURCE_DOMAIN_PROVIDERS[domain].some(
            (def) => def.kind === "connection" && def.provider === c.provider,
          ),
        )
        .map((domain) => ({
          id: `${domain}:${c.id}`,
          domain,
          provider: c.provider,
          status: c.lastError ? "error" : "connected",
          lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
        })),
    );

    return {
      accounts: accounts.map((a) => ({
        provider: a.provider,
        externalId: a.providerAccountId,
        displayName: a.displayName ?? null,
        linkedAt: a.createdAt.toISOString(),
      })),
      sources,
      apiKeys: apiKeys.map((k) => ({
        id: k.id,
        type: k.type,
        tokenPrefix: k.tokenPrefix,
        label: k.label ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      })),
      qmonitorDeviceCount,
      lastSyncedAt: user?.lastSyncedAt?.toISOString() ?? null,
    };
  }
}
