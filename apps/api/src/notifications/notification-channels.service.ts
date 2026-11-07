import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  NotificationChannel,
  NotificationChannelConfig,
  NotificationChannelCreate,
  NotificationChannelListResponse,
  NotificationChannelUpdate,
} from "@questorylabs/shared";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { generateApiToken, hashApiToken } from "../accounts/accounts.service";
import { CacheService } from "../cache/cache.service";
import { encryptSecret } from "../lib/secret-crypto";
import { assertPublicHttpsTarget, OutboundTargetError } from "../lib/outbound-url-guard";
import { parseStringArray, stringifyStringArray } from "../lib/json-arrays";
import {
  NotificationDeliveryService,
  parseChannelConfig,
} from "./delivery/notification-delivery.service";
import {
  NOTIFICATION_CHANNEL_LIMIT,
  NOTIFICATION_TEST_LIMIT,
  NOTIFICATION_VERIFY_IP_LIMIT,
  NOTIFICATION_VERIFY_TTL_MS,
} from "./delivery/notification-delivery.constants";

type ChannelRow = {
  id: string;
  kind: string;
  label: string | null;
  config: string;
  types: string;
  enabled: boolean;
  lastSentAt: Date | null;
  lastError: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
};

export function redactTarget(parsed: NotificationChannelConfig): string {
  switch (parsed.kind) {
    case "discord": {
      const path = new URL(parsed.config.webhookUrl).pathname.split("/").filter(Boolean);
      const id = path[2] ?? "";
      return `discord.com/…/${id.slice(0, 4)}…${id.slice(-4)}`;
    }
    case "ntfy": {
      const host = new URL(parsed.config.server).host;
      return `${host}/${parsed.config.topic}`;
    }
    case "email": {
      const [local, domain] = parsed.config.address.split("@");
      const shown = local.length <= 2 ? local[0] ?? "" : local.slice(0, 2);
      return `${shown}…@${domain}`;
    }
  }
}

function toChannel(row: ChannelRow): NotificationChannel {
  let target = "unavailable";
  try {
    target = redactTarget(parseChannelConfig(row));
  } catch {}
  return {
    id: row.id,
    kind: row.kind as NotificationChannel["kind"],
    label: row.label,
    target,
    types: parseStringArray(row.types) as NotificationChannel["types"],
    enabled: row.enabled,
    lastSentAt: row.lastSentAt?.toISOString() ?? null,
    lastError: row.lastError,
    verified: row.verifiedAt != null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  async list(userId: string): Promise<NotificationChannelListResponse> {
    const rows = await this.prisma.notificationChannel.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: NOTIFICATION_CHANNEL_LIMIT,
    });
    return { items: rows.map(toChannel), availableKinds: this.delivery.availableKinds() };
  }

  async create(userId: string, input: NotificationChannelCreate): Promise<NotificationChannel> {
    if (!this.delivery.availableKinds().includes(input.kind)) {
      throw new BadRequestException(`${input.kind} delivery is not available on this server`);
    }
    if (input.kind === "ntfy") {
      try {
        await assertPublicHttpsTarget(input.config.server || "https://ntfy.sh", AbortSignal.timeout(5_000));
      } catch (err) {
        throw new BadRequestException(
          err instanceof OutboundTargetError ? err.message : "ntfy server could not be checked",
        );
      }
    }
    const count = await this.prisma.notificationChannel.count({ where: { userId } });
    if (count >= NOTIFICATION_CHANNEL_LIMIT) {
      throw new BadRequestException(`At most ${NOTIFICATION_CHANNEL_LIMIT} channels per account`);
    }
    const verify = input.kind === "email" ? this.newVerifyToken() : null;
    const row = await this.prisma.notificationChannel.create({
      data: {
        userId,
        kind: input.kind,
        label: input.label ?? null,
        config: encryptSecret(JSON.stringify(input.config)),
        types: stringifyStringArray(input.types),
        ...(verify ? verify.data : { verifiedAt: new Date() }),
      },
    });
    if (!verify) return toChannel(row);
    const error = await this.trySendVerification(row, verify.token);
    return toChannel({ ...row, lastError: error ?? row.lastError });
  }

  async resendVerification(userId: string, id: string): Promise<{ ok: boolean; error: string | null }> {
    await this.assertTestBudget(userId);
    const row = await this.prisma.notificationChannel.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException("Channel not found");
    if (row.verifiedAt) return { ok: true, error: null };
    const verify = this.newVerifyToken();
    const updated = await this.prisma.notificationChannel.update({
      where: { id: row.id },
      data: verify.data,
    });
    const error = await this.trySendVerification(updated, verify.token);
    return { ok: error == null, error };
  }

  async verify(token: string, ip: string): Promise<{ ok: true }> {
    const ipKey = createHash("sha256").update(ip).digest("hex").slice(0, 32);
    const hits = await this.cache.incr(
      `notif:verify:ip:${ipKey}`,
      NOTIFICATION_VERIFY_IP_LIMIT.windowSeconds,
    );
    if (hits > NOTIFICATION_VERIFY_IP_LIMIT.max) {
      throw new HttpException(
        { message: "Too many attempts. Try again later." },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const row = await this.prisma.notificationChannel.findUnique({
      where: { verifyTokenHash: hashApiToken(token) },
      select: { id: true, verifyExpiresAt: true },
    });
    if (!row || !row.verifyExpiresAt || row.verifyExpiresAt.getTime() < Date.now()) {
      throw new NotFoundException("This link is invalid or has expired");
    }
    await this.prisma.notificationChannel.update({
      where: { id: row.id },
      data: { verifiedAt: new Date(), verifyTokenHash: null, verifyExpiresAt: null, lastError: null },
    });
    return { ok: true };
  }

  private newVerifyToken() {
    const { token, hash } = generateApiToken();
    return {
      token,
      data: {
        verifiedAt: null,
        verifyTokenHash: hash,
        verifyExpiresAt: new Date(Date.now() + NOTIFICATION_VERIFY_TTL_MS),
      },
    };
  }

  private async trySendVerification(row: Parameters<NotificationDeliveryService["sendToChannel"]>[0], token: string) {
    try {
      await this.delivery.sendVerificationEmail(row, token);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }

  private async assertTestBudget(userId: string): Promise<void> {
    const hits = await this.cache.incr(
      `notif:test:${userId}`,
      NOTIFICATION_TEST_LIMIT.windowSeconds,
    );
    if (hits > NOTIFICATION_TEST_LIMIT.max) {
      throw new HttpException(
        { message: "Too many test notifications. Try again later." },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async update(
    userId: string,
    id: string,
    input: NotificationChannelUpdate,
  ): Promise<NotificationChannel> {
    const existing = await this.prisma.notificationChannel.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Channel not found");
    const row = await this.prisma.notificationChannel.update({
      where: { id: existing.id },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.types ? { types: stringifyStringArray(input.types) } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
    });
    return toChannel(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const result = await this.prisma.notificationChannel.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException("Channel not found");
    return { ok: true };
  }

  async test(userId: string, id: string): Promise<{ ok: boolean; error: string | null }> {
    await this.assertTestBudget(userId);
    const row = await this.prisma.notificationChannel.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException("Channel not found");
    if (!row.verifiedAt) {
      return { ok: false, error: "Confirm this email address first" };
    }
    if (!(await this.delivery.isEnabled())) {
      return { ok: false, error: "Notification delivery is disabled by your admin" };
    }
    try {
      await this.delivery.sendToChannel(row, {
        type: "test",
        title: "Test notification",
        body: "Questory can reach this channel.",
        href: "/settings/profile",
      });
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
