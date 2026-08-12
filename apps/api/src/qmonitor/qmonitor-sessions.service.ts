import { Injectable } from "@nestjs/common";
import type { PlaySessionPage } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class QmonitorSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    page = 1,
    pageSize = 15,
  ): Promise<PlaySessionPage> {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * take;
    const where = { userId };

    const [total, rows] = await Promise.all([
      this.prisma.playSession.count({ where }),
      this.prisma.playSession.findMany({
        where,
        orderBy: { endedAt: "desc" },
        skip,
        take,
        include: {
          game: {
            select: {
              id: true,
              name: true,
              headerImage: true,
              appId: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page: safePage,
      pageSize: take,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        source: r.source,
        appId: r.appId,
        gameId: r.gameId,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt.toISOString(),
        durationSecs: r.durationSecs,
        exe: r.exe,
        hostOs: r.hostOs,
        hostName: r.hostName,
        game: r.game
          ? {
              id: r.game.id,
              name: r.game.name,
              headerImage: r.game.headerImage,
              appId: r.game.appId,
            }
          : null,
      })),
    };
  }
}
