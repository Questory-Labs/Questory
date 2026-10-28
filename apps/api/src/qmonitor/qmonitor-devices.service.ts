import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QMONITOR_DEVICES_LIMIT } from "./qmonitor.constants";

@Injectable()
export class QmonitorDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.qmonitorDeviceSession.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: [
        { revokedAt: { sort: "asc", nulls: "first" } },
        { lastUsedAt: "desc" },
      ],
      take: QMONITOR_DEVICES_LIMIT,
    });
    return {
      devices: rows.map((d) => ({
        id: d.id,
        label: d.label ?? null,
        lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        revokedAt: d.revokedAt?.toISOString() ?? null,
      })),
    };
  }

  async countActive(userId: string) {
    return this.prisma.qmonitorDeviceSession.count({
      where: { userId, revokedAt: null },
    });
  }

  async revoke(userId: string, id: string) {
    const existing = await this.prisma.qmonitorDeviceSession.findFirst({
      where: { id, userId },
      select: { id: true, revokedAt: true },
    });
    if (!existing) throw new NotFoundException("Device not found");
    if (!existing.revokedAt) {
      await this.prisma.qmonitorDeviceSession.updateMany({
        where: { id, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }
}
