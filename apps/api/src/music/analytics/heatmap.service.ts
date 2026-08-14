import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { rangeStart, type RangeKey } from "./analytics.service";
import { buildHourDowHeatmap } from "./heatmap-matrix";

@Injectable()
export class HeatmapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async userHeatmap(
    userId: string,
    range: RangeKey = "week",
    timeZone = "UTC",
  ) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Music user not found");

    const since = rangeStart(range);
    const buckets = await this.prisma.listenHourBucket.findMany({
      where: {
        userId: user.id,
        ...(since ? { hourStart: { gte: since } } : {}),
      },
      select: { hourStart: true, listenCount: true },
    });

    return buildHourDowHeatmap(
      buckets.map((b) => ({ at: b.hourStart, count: b.listenCount })),
      timeZone,
    );
  }
}
