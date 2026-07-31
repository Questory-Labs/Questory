import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const PROVIDER = "letterboxd";

@Injectable()
export class LetterboxdConnectService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeUsername(username: string): string {
    return username.trim().replace(/^@/, "").toLowerCase();
  }

  async getStatus(userId: string) {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: PROVIDER } },
    });
    if (!conn) {
      return {
        connected: false,
        username: null,
        lastSyncedAt: null,
        syncCursor: null,
      };
    }
    return {
      connected: true,
      username: conn.externalUserId,
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
      syncCursor: conn.syncCursor,
    };
  }

  async connect(userId: string, username: string) {
    const normalized = this.normalizeUsername(username);
    if (!normalized) {
      throw new BadRequestException("Username is required");
    }
    if (!/^[a-z0-9_-]+$/i.test(normalized)) {
      throw new BadRequestException("Invalid Letterboxd username");
    }

    const conn = await this.prisma.sourceConnection.upsert({
      where: { userId_provider: { userId, provider: PROVIDER } },
      create: {
        userId,
        provider: PROVIDER,
        externalUserId: normalized,
        accessToken: "",
      },
      update: {
        externalUserId: normalized,
      },
    });

    return {
      connected: true,
      username: conn.externalUserId,
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
      syncCursor: conn.syncCursor,
    };
  }

  async disconnect(userId: string) {
    const conn = await this.prisma.sourceConnection.findUnique({
      where: { userId_provider: { userId, provider: PROVIDER } },
    });
    if (!conn) throw new NotFoundException("Letterboxd not connected");
    await this.prisma.sourceConnection.delete({
      where: { userId_provider: { userId, provider: PROVIDER } },
    });
    return { ok: true };
  }

  async listConnections() {
    return this.prisma.sourceConnection.findMany({
      where: { provider: PROVIDER },
      select: {
        userId: true,
        externalUserId: true,
        syncCursor: true,
        lastSyncedAt: true,
      },
    });
  }
}
