import { BadRequestException, Injectable } from "@nestjs/common";
import { QmonitorSessionWebhookSchema } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { GameMergeService } from "../stores/game-merge.service";
import { QmonitorSessionRulesService } from "./qmonitor-session-rules.service";

@Injectable()
export class QmonitorIngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GameMergeService,
    private readonly rules: QmonitorSessionRulesService,
  ) {}

  async ingest(userId: string, body: unknown) {
    const parsed = QmonitorSessionWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const startedAt = new Date(data.started_at);
    const endedAt = new Date(data.ended_at);
    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      endedAt < startedAt
    ) {
      throw new BadRequestException("Invalid started_at / ended_at");
    }

    let gameId: string | null = null;
    let appId: number | null = data.steam_app_id ?? null;

    const ruled = await this.rules.resolveTarget(userId, data.title, data.exe);
    if (ruled) {
      gameId = ruled.gameId;
      appId = ruled.appId ?? data.steam_app_id ?? null;
    } else if (data.steam_app_id) {
      const { game } = await this.games.upsertListing({
        store: "steam",
        externalId: String(data.steam_app_id),
        name: data.title,
        steamAppId: data.steam_app_id,
        userId,
      });
      gameId = game.id;
      appId = game.appId ?? data.steam_app_id;
    }

    const rawPayload = JSON.stringify(data);
    const session = await this.prisma.playSession.upsert({
      where: {
        userId_externalId: {
          userId,
          externalId: data.session_id,
        },
      },
      create: {
        userId,
        gameId,
        appId,
        title: data.title,
        source: data.source,
        externalId: data.session_id,
        startedAt,
        endedAt,
        durationSecs: data.duration_secs,
        exe: data.exe ?? null,
        hostOs: data.host.os,
        hostName: data.host.hostname,
        rawPayload,
      },
      update: {
        gameId,
        appId,
        title: data.title,
        source: data.source,
        startedAt,
        endedAt,
        durationSecs: data.duration_secs,
        exe: data.exe ?? null,
        hostOs: data.host.os,
        hostName: data.host.hostname,
        rawPayload,
      },
    });

    if (gameId) {
      const entry = await this.prisma.libraryEntry.findUnique({
        where: { userId_gameId: { userId, gameId } },
        select: { id: true, lastPlayedAt: true },
      });
      if (
        entry &&
        (!entry.lastPlayedAt || entry.lastPlayedAt.getTime() < endedAt.getTime())
      ) {
        await this.prisma.libraryEntry.update({
          where: { id: entry.id },
          data: { lastPlayedAt: endedAt },
        });
      }
    }

    return { ok: true as const, id: session.id };
  }
}
