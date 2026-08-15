import { Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "../../cache/cache.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LASTFM_PROVIDER,
  MUSIC_SCROBBLER_PROVIDERS,
  SCROBBLER_AUTH_FAILED,
  SCROBBLER_CONNECTION_CACHE_TTL_SECONDS,
  SCROBBLER_NATIVE_CACHE_TTL_SECONDS,
  nativeCacheKey,
  type MusicScrobblerProviderId,
} from "./scrobbler.constants";
import { decryptSecret, encryptSecret } from "./scrobbler-crypto";
import type { SourceConn } from "./scrobbler.types";
import { isLastFmConfigured } from "../lib/runtime-config";

const LIST_CACHE_KEY = "scrobbler:connections";

@Injectable()
export class ScrobblerConnections {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listActive(): Promise<SourceConn[]> {
    const cached = await this.cache.getJson<SourceConn[]>(LIST_CACHE_KEY);
    if (cached) return cached.filter((row) => row.lastError !== SCROBBLER_AUTH_FAILED);

    const rows = await this.prisma.sourceConnection.findMany({
      where: { provider: { in: [...MUSIC_SCROBBLER_PROVIDERS] } },
    });
    const mapped = rows.map((row) => this.toConn(row));
    await this.cache.setJson(
      LIST_CACHE_KEY,
      mapped,
      SCROBBLER_CONNECTION_CACHE_TTL_SECONDS,
    );
    return mapped.filter((row) => row.lastError !== SCROBBLER_AUTH_FAILED);
  }

  async get(userId: string, provider: MusicScrobblerProviderId) {
    const row = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    return row ? this.toConn(row) : null;
  }

  async hasNative(userId: string): Promise<boolean> {
    const cached = await this.cache.getJson<boolean>(nativeCacheKey(userId));
    if (cached != null) return cached;

    const count = await this.prisma.sourceConnection.count({
      where: {
        userId,
        provider: { in: [...MUSIC_SCROBBLER_PROVIDERS] },
      },
    });
    const active = count > 0;
    await this.cache.setJson(
      nativeCacheKey(userId),
      active,
      SCROBBLER_NATIVE_CACHE_TTL_SECONDS,
    );
    return active;
  }

  async upsert(input: {
    userId: string;
    provider: MusicScrobblerProviderId;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    externalUserId?: string | null;
    syncCursor?: string | null;
  }): Promise<SourceConn> {
    const accessToken = encryptSecret(input.accessToken);
    const refreshToken =
      input.refreshToken != null && input.refreshToken !== ""
        ? encryptSecret(input.refreshToken)
        : null;
    const row = await this.prisma.sourceConnection.upsert({
      where: {
        userId_provider: { userId: input.userId, provider: input.provider },
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        accessToken,
        refreshToken,
        expiresAt: input.expiresAt ?? null,
        externalUserId: input.externalUserId ?? null,
        syncCursor: input.syncCursor ?? null,
        lastError: null,
      },
      update: {
        accessToken,
        refreshToken,
        expiresAt: input.expiresAt ?? null,
        externalUserId: input.externalUserId ?? null,
        lastError: null,
        ...(input.syncCursor !== undefined
          ? { syncCursor: input.syncCursor }
          : {}),
      },
    });
    await this.invalidate(input.userId);
    return this.toConn(row);
  }

  async updatePoll(
    id: string,
    data: {
      syncCursor?: string | null;
      lastSyncedAt?: Date | null;
      lastError?: string | null;
    },
  ) {
    await this.prisma.sourceConnection.update({
      where: { id },
      data,
    });
    await this.cache.del(LIST_CACHE_KEY);
  }

  async disconnect(userId: string, provider: MusicScrobblerProviderId) {
    const existing = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!existing) throw new NotFoundException("Scrobbler not connected");
    await this.prisma.sourceConnection.delete({
      where: { userId_provider: { userId, provider } },
    });
    await this.invalidate(userId);
    return { ok: true as const };
  }

  async lastFmStatus(userId: string) {
    const conn = await this.get(userId, LASTFM_PROVIDER);
    const nativeScrobbling = await this.hasNative(userId);
    return {
      nativeScrobbling,
      lastfm: {
        configured: isLastFmConfigured(),
        connected: Boolean(conn),
        username: conn?.externalUserId ?? null,
        lastSyncedAt: conn?.lastSyncedAt?.toISOString() ?? null,
        lastError: conn?.lastError ?? null,
      },
    };
  }

  sessionKey(conn: SourceConn): string {
    return decryptSecret(conn.accessToken);
  }

  private async invalidate(userId: string) {
    await Promise.all([
      this.cache.del(LIST_CACHE_KEY),
      this.cache.del(nativeCacheKey(userId)),
    ]);
  }

  private toConn(row: {
    id: string;
    userId: string;
    provider: string;
    externalUserId: string | null;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    syncCursor: string | null;
    lastSyncedAt: Date | null;
    lastError: string | null;
  }): SourceConn {
    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      externalUserId: row.externalUserId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      syncCursor: row.syncCursor,
      lastSyncedAt: row.lastSyncedAt,
      lastError: row.lastError,
    };
  }
}
