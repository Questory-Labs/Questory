import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PlaySessionAssignResult,
  PlaySessionGameSuggestPage,
  PlaySessionSimilar,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { containsInsensitive } from "../search/search-text";
import {
  PLAY_SESSION_GAME_SUGGEST_LIMIT,
  PLAY_SESSION_RULES_CACHE_TTL_MS,
  PLAY_SESSION_SIMILAR_CANDIDATE_CAP,
} from "./qmonitor.constants";
import {
  sessionMatchIdentity,
  sessionMatchesIdentity,
  type SessionMatchIdentity,
} from "./session-identity";

type CachedRule = {
  matchKey: string;
  targetGameId: string;
  appId: number | null;
};

@Injectable()
export class QmonitorSessionRulesService {
  private rulesCache = new Map<
    string,
    { loadedAt: number; rules: CachedRule[] }
  >();

  constructor(private readonly prisma: PrismaService) {}

  invalidateRulesCache(userId: string) {
    this.rulesCache.delete(userId);
  }

  async resolveTarget(
    userId: string,
    title: string,
    exe?: string | null,
  ): Promise<{ gameId: string; appId: number | null } | null> {
    const identity = sessionMatchIdentity(exe, title);
    const rules = await this.loadUserRules(userId);
    const match = rules.find((rule) => rule.matchKey === identity.matchKey);
    if (!match) return null;
    return { gameId: match.targetGameId, appId: match.appId };
  }

  async suggestLibraryGames(
    userId: string,
    q: string,
  ): Promise<PlaySessionGameSuggestPage> {
    const text = q.trim();
    const entries = await this.prisma.libraryEntry.findMany({
      where: {
        userId,
        ...(text ? { game: { name: containsInsensitive(text) } } : {}),
      },
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
      take: PLAY_SESSION_GAME_SUGGEST_LIMIT,
      orderBy: [{ lastPlayedAt: "desc" }, { syncedAt: "desc" }],
    });

    return {
      items: entries.map((entry) => ({
        gameId: entry.game.id,
        name: entry.game.name,
        headerImage: entry.game.headerImage,
        appId: entry.game.appId,
      })),
    };
  }

  async similar(userId: string, sessionId: string): Promise<PlaySessionSimilar> {
    const session = await this.requireSession(userId, sessionId);
    const identity = sessionMatchIdentity(session.exe, session.title);
    const matches = await this.findSimilarSessions(userId, identity);
    return {
      count: matches.length,
      matchKind: identity.matchKind,
      matchValue: identity.matchValue,
    };
  }

  async assign(
    userId: string,
    sessionId: string,
    gameId: string,
  ): Promise<PlaySessionAssignResult> {
    const session = await this.requireSession(userId, sessionId);
    const entry = await this.prisma.libraryEntry.findUnique({
      where: { userId_gameId: { userId, gameId } },
      include: {
        game: { select: { id: true, appId: true } },
      },
    });
    if (!entry) {
      throw new BadRequestException("Game is not in your library");
    }

    const identity = sessionMatchIdentity(session.exe, session.title);
    const rule = await this.prisma.userPlaySessionRule.upsert({
      where: {
        userId_matchKey: { userId, matchKey: identity.matchKey },
      },
      create: {
        userId,
        matchKey: identity.matchKey,
        matchExeNorm: identity.matchExeNorm,
        matchTitleNorm: identity.matchTitleNorm,
        targetGameId: gameId,
      },
      update: {
        matchExeNorm: identity.matchExeNorm,
        matchTitleNorm: identity.matchTitleNorm,
        targetGameId: gameId,
      },
    });
    this.invalidateRulesCache(userId);

    const similar = await this.findSimilarSessions(userId, identity);
    const ids = similar.map((row) => row.id);
    if (ids.length > 0) {
      await this.prisma.playSession.updateMany({
        where: { userId, id: { in: ids } },
        data: {
          gameId: entry.game.id,
          appId: entry.game.appId,
        },
      });
    }

    const latestEnded = similar.reduce<Date | null>((max, row) => {
      if (!max || row.endedAt.getTime() > max.getTime()) return row.endedAt;
      return max;
    }, null);
    if (latestEnded) {
      await this.bumpLastPlayedAt(userId, gameId, latestEnded);
    }

    return {
      ok: true,
      assignedCount: ids.length,
      ruleId: rule.id,
    };
  }

  private async requireSession(userId: string, sessionId: string) {
    const session = await this.prisma.playSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  private async findSimilarSessions(
    userId: string,
    identity: SessionMatchIdentity,
  ) {
    const candidates = await this.prisma.playSession.findMany({
      where:
        identity.matchKind === "exe"
          ? {
              userId,
              exe: { contains: identity.matchValue, mode: "insensitive" },
            }
          : {
              userId,
              OR: [{ exe: null }, { exe: "" }],
            },
      select: { id: true, exe: true, title: true, endedAt: true },
      take: PLAY_SESSION_SIMILAR_CANDIDATE_CAP,
      orderBy: { endedAt: "desc" },
    });

    return candidates.filter((row) =>
      sessionMatchesIdentity(row.exe, row.title, identity),
    );
  }

  private async bumpLastPlayedAt(
    userId: string,
    gameId: string,
    endedAt: Date,
  ) {
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

  private async loadUserRules(userId: string): Promise<CachedRule[]> {
    const cached = this.rulesCache.get(userId);
    if (
      cached &&
      Date.now() - cached.loadedAt < PLAY_SESSION_RULES_CACHE_TTL_MS
    ) {
      return cached.rules;
    }

    const rows = await this.prisma.userPlaySessionRule.findMany({
      where: { userId },
      select: {
        matchKey: true,
        targetGameId: true,
        targetGame: { select: { appId: true } },
      },
    });
    const rules = rows.map((row) => ({
      matchKey: row.matchKey,
      targetGameId: row.targetGameId,
      appId: row.targetGame.appId,
    }));
    this.rulesCache.set(userId, { loadedAt: Date.now(), rules });
    return rules;
  }
}
