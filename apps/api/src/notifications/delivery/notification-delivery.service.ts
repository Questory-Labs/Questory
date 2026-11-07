import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker, type Job } from "bullmq";
import {
  NOTIFICATION_CHANNEL_KINDS,
  NotificationChannelConfigSchema,
  type NotificationChannelConfig,
  type NotificationChannelKind,
} from "@questorylabs/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { decryptSecret } from "../../lib/secret-crypto";
import { bullmqConnection } from "../../lib/redis-connection";
import { resolveSyncMode } from "../../lib/runtime-config";
import { parseStringArray } from "../../lib/json-arrays";
import {
  NOTIFICATION_DELIVERY_ENABLED_KEY,
  NOTIFICATION_DELIVERY_QUEUE,
  NOTIFICATION_DELIVERY_TIMEOUT_MS,
  smtpConfigured,
  type DeliveryMessage,
} from "./notification-delivery.constants";
import { sendDiscord } from "./discord.sender";
import { sendNtfy } from "./ntfy.sender";
import { sendEmail } from "./email.sender";

type DeliveryJob = { userId: string; message: DeliveryMessage; channelId?: string };

type ChannelRow = {
  id: string;
  kind: string;
  config: string;
  types: string;
  enabled: boolean;
};

export function channelMatches(types: string, type: string): boolean {
  const list = parseStringArray(types);
  return list.includes("*") || list.includes(type);
}

export function parseChannelConfig(row: Pick<ChannelRow, "kind" | "config">): NotificationChannelConfig {
  const parsed = NotificationChannelConfigSchema.safeParse({
    kind: row.kind,
    config: JSON.parse(decryptSecret(row.config)),
  });
  if (!parsed.success) throw new Error("Invalid channel config");
  return parsed.data;
}

@Injectable()
export class NotificationDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private queue: Queue<DeliveryJob> | null = null;
  private worker: Worker<DeliveryJob> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (resolveSyncMode() !== "queue") return;
    const url = process.env.REDIS_URL;
    if (!url) return;
    const connection = bullmqConnection(url);
    this.queue = new Queue<DeliveryJob>(NOTIFICATION_DELIVERY_QUEUE, { connection });
    this.worker = new Worker<DeliveryJob>(
      NOTIFICATION_DELIVERY_QUEUE,
      (job: Job<DeliveryJob>) => this.deliverNow(job.data),
      { connection, concurrency: 2 },
    );
    this.worker.on("error", (err) => {
      this.logger.warn(`notification-delivery worker error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.worker?.close(), this.queue?.close()]);
  }

  availableKinds(): NotificationChannelKind[] {
    return NOTIFICATION_CHANNEL_KINDS.filter((k) => k !== "email" || smtpConfigured());
  }

  async isEnabled(): Promise<boolean> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: NOTIFICATION_DELIVERY_ENABLED_KEY },
    });
    return row?.value !== "false";
  }

  async setEnabled(enabled: boolean): Promise<void> {
    const value = enabled ? "true" : "false";
    await this.prisma.appConfig.upsert({
      where: { key: NOTIFICATION_DELIVERY_ENABLED_KEY },
      create: { key: NOTIFICATION_DELIVERY_ENABLED_KEY, value },
      update: { value },
    });
  }

  async dispatch(userId: string, message: DeliveryMessage): Promise<void> {
    try {
      if (this.queue) {
        await this.queue.add(
          "deliver",
          { userId, message },
          { removeOnComplete: 100, removeOnFail: 100 },
        );
        return;
      }
      await this.deliverNow({ userId, message });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      this.logger.warn(`notification dispatch failed for ${userId}: ${text}`);
    }
  }

  async deliverNow(job: DeliveryJob): Promise<void> {
    if (!(await this.isEnabled())) return;
    const channels = await this.prisma.notificationChannel.findMany({
      where: {
        userId: job.userId,
        enabled: true,
        verifiedAt: { not: null },
        ...(job.channelId ? { id: job.channelId } : {}),
      },
    });
    const targets = channels.filter(
      (c) => Boolean(job.channelId) || channelMatches(c.types, job.message.type),
    );
    await Promise.allSettled(targets.map((c) => this.sendToChannel(c, job.message)));
  }

  async sendVerificationEmail(channel: ChannelRow, token: string): Promise<void> {
    await this.sendToChannel(channel, {
      type: "verify",
      title: "Confirm your email for notifications",
      body: "Open this link and press Confirm to start receiving Questory notifications here. The link expires in 24 hours. If you did not add this address, ignore this email.",
      href: `/notifications/verify/${token}`,
    });
  }

  async sendToChannel(channel: ChannelRow, message: DeliveryMessage): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOTIFICATION_DELIVERY_TIMEOUT_MS);
    try {
      const parsed = parseChannelConfig(channel);
      if (parsed.kind === "email" && !smtpConfigured()) {
        throw new Error("Email delivery is not configured on this server");
      }
      await this.send(parsed, message, controller.signal);
      await this.prisma.notificationChannel.update({
        where: { id: channel.id },
        data: { lastSentAt: new Date(), lastError: null },
      });
    } catch (err) {
      const text = controller.signal.aborted
        ? "Timed out"
        : err instanceof Error
          ? err.message
          : String(err);
      await this.prisma.notificationChannel
        .update({
          where: { id: channel.id },
          data: { lastError: text.slice(0, 300) },
        })
        .catch(() => undefined);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private send(
    parsed: NotificationChannelConfig,
    message: DeliveryMessage,
    signal: AbortSignal,
  ): Promise<void> {
    switch (parsed.kind) {
      case "discord":
        return sendDiscord(parsed.config, message, signal);
      case "ntfy":
        return sendNtfy(parsed.config, message, signal);
      case "email":
        return Promise.race([
          sendEmail(parsed.config, message),
          new Promise<never>((_, reject) =>
            signal.addEventListener("abort", () => reject(new Error("Timed out")), {
              once: true,
            }),
          ),
        ]);
    }
  }
}
