import { Injectable, NotFoundException } from "@nestjs/common";
import type { SourceDomain, SourcesOverview } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../watch/users/users.service";
import {
  SOURCE_DOMAIN_PROVIDERS,
  SOURCES_ERROR_MAX,
  SOURCES_ROW_LIMIT,
} from "./sources.constants";

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async overview(userId: string): Promise<SourcesOverview> {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("User not found");

    const defs = Object.values(SOURCE_DOMAIN_PROVIDERS).flat();
    const connectionProviders = [
      ...new Set(defs.filter((d) => d.kind === "connection").map((d) => d.provider)),
    ];
    const keyTypes = [
      ...new Set(defs.filter((d) => d.kind === "api_key").map((d) => d.provider)),
    ];

    const [connections, keys] = await Promise.all([
      this.prisma.sourceConnection.findMany({
        where: { userId: user.id, provider: { in: connectionProviders } },
        take: SOURCES_ROW_LIMIT,
        select: {
          provider: true,
          lastSyncedAt: true,
          lastError: true,
          externalUserId: true,
        },
      }),
      this.prisma.apiKey.findMany({
        where: { userId: user.id, type: { in: keyTypes }, revokedAt: null },
        orderBy: { createdAt: "desc" },
        take: SOURCES_ROW_LIMIT,
        select: { type: true, lastUsedAt: true, createdAt: true },
      }),
    ]);

    const connByProvider = new Map(connections.map((c) => [c.provider, c]));
    const keyByType = new Map<string, (typeof keys)[number]>();
    for (const k of keys) {
      const cur = keyByType.get(k.type);
      const at = k.lastUsedAt ?? k.createdAt;
      if (!cur || at > (cur.lastUsedAt ?? cur.createdAt)) keyByType.set(k.type, k);
    }

    const domains = (Object.keys(SOURCE_DOMAIN_PROVIDERS) as SourceDomain[]).map(
      (domain) => {
        const providers = SOURCE_DOMAIN_PROVIDERS[domain].map((def) => {
          if (def.kind === "api_key") {
            const key = keyByType.get(def.provider);
            return {
              provider: def.provider,
              kind: def.kind,
              connected: Boolean(key),
              lastSyncedAt: key?.lastUsedAt?.toISOString() ?? null,
              lastError: null,
              account: null,
            };
          }
          const conn = connByProvider.get(def.provider);
          return {
            provider: def.provider,
            kind: def.kind,
            connected: Boolean(conn),
            lastSyncedAt: conn?.lastSyncedAt?.toISOString() ?? null,
            lastError: conn?.lastError?.slice(0, SOURCES_ERROR_MAX) ?? null,
            account: def.showAccount ? (conn?.externalUserId ?? null) : null,
          };
        });
        return {
          domain,
          connected: providers.filter((p) => p.connected).length,
          providers,
        };
      },
    );

    return {
      connected: connByProvider.size + keyByType.size,
      domains,
    };
  }
}
