import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationDeliveryService } from "./delivery/notification-delivery.service";

export type NotificationCreateInput = {
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown> | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  async create(userId: string, input: NotificationCreateInput) {
    const row = await this.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? "",
        href: input.href ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : "{}",
      },
    });
    await this.delivery.dispatch(userId, {
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
    });
    return row;
  }

  async list(userId: string, unreadOnly = false) {
    const items = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id?: string) {
    if (id) {
      await this.prisma.notification.updateMany({
        where: { userId, id },
        data: { readAt: new Date() },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  }
}
