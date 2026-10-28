import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { AccountsService } from "../accounts/accounts.service";
import { SyncService } from "./sync.service";
import {
  USER_SYNC_ACTIVE_WINDOW_MS,
  USER_SYNC_COOLDOWN_SEC,
} from "./user-sync.constants";

@Injectable()
export class UserSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly accounts: AccountsService,
    private readonly sync: SyncService,
  ) {}

  async request(userId: string): Promise<{ queued: true }> {
    const steamId = await this.accounts.getSteamId(userId);
    if (!steamId) {
      throw new BadRequestException("Link a Steam account before syncing");
    }
    const active = await this.prisma.syncJob.findFirst({
      where: {
        userId,
        status: { in: ["pending", "running"] },
        createdAt: { gte: new Date(Date.now() - USER_SYNC_ACTIVE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException("A sync is already running");
    }

    const key = `sync:user:cooldown:${userId}`;
    const untilKey = `${key}:until`;
    const acquired = await this.cache.acquireLock(key, USER_SYNC_COOLDOWN_SEC);
    if (!acquired) {
      const until = Number(await this.cache.getString(untilKey));
      const retryAfterSec = Number.isFinite(until)
        ? Math.max(1, Math.ceil((until - Date.now()) / 1000))
        : USER_SYNC_COOLDOWN_SEC;
      throw new HttpException(
        {
          statusCode: 429,
          message: "Sync was requested recently, try again later",
          retryAfterSec: Math.min(retryAfterSec, USER_SYNC_COOLDOWN_SEC),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.cache.setString(
      untilKey,
      String(Date.now() + USER_SYNC_COOLDOWN_SEC * 1000),
      USER_SYNC_COOLDOWN_SEC,
    );

    try {
      await this.sync.enqueueAll(userId, steamId, { force: true });
    } catch (err) {
      await this.cache.releaseLock(key);
      await this.cache.del(untilKey);
      throw err;
    }
    return { queued: true };
  }
}
