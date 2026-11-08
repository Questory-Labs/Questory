import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  PublicRewindShare,
  RewindBadge,
  RewindBadgeCreated,
  RewindShare,
  RewindShareCreate,
  RewindShareCreated,
  RewindStatsResponse,
} from "@questorylabs/shared";
import { generateApiToken, hashApiToken } from "../accounts/accounts.service";
import { CacheService } from "../cache/cache.service";
import { resolveAllowedOrigins } from "../lib/runtime-config";
import { parseRewindTimeZone } from "../lib/rewind-stats";
import { PrismaService } from "../prisma/prisma.service";
import { MonthlyRecapService } from "../recap/monthly-recap.service";

export const SHARE_KIND_REWIND = "rewind";
export const SHARE_KIND_BADGE = "badge";
export const BADGE_DOMAIN = "now_playing";
const SHARE_LIST_LIMIT = 50;
export const MAX_ACTIVE_SHARES = SHARE_LIST_LIMIT;
export const MAX_ACTIVE_BADGES = 10;
export const VIEW_COUNT_WRITES_PER_MINUTE = 300;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const BADGE_TEXT_MAX = 48;

type ShareRow = {
  id: string;
  kind: string;
  domain: string;
  period: string;
  tokenPrefix: string;
  snapshot: string;
  theme: string | null;
  viewCount: number;
  createdAt: Date;
  revokedAt: Date | null;
};

type Snapshot = {
  stats: RewindStatsResponse;
  ai: { content: string; generatedAt: string } | null;
};

export function webBaseUrl(): string {
  const explicit = process.env.PUBLIC_WEB_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return (resolveAllowedOrigins()[0] ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function apiBaseUrl(): string {
  const explicit = process.env.PUBLIC_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const returnUrl = process.env.STEAM_RETURN_URL?.trim();
  if (returnUrl) {
    try {
      return new URL(returnUrl).origin;
    } catch {
      /* fall through */
    }
  }
  return `http://localhost:${process.env.API_PORT || 4000}`;
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function renderBadgeSvg(input: {
  personaName: string;
  gameTitle: string | null;
}): string {
  const name = escapeXml(clip(input.personaName, BADGE_TEXT_MAX));
  const label = input.gameTitle ? "Last played" : "On Questory";
  const game = escapeXml(clip(input.gameTitle ?? "Nothing yet", BADGE_TEXT_MAX));
  const width = Math.min(520, Math.max(260, 120 + Math.max(name.length, game.length) * 8));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64" role="img" aria-label="${name}: ${label} ${game}">`,
    `<rect width="${width}" height="64" rx="12" fill="#09090a"/>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="63" rx="11.5" fill="none" stroke="#2a2a2e"/>`,
    `<circle cx="28" cy="32" r="6" fill="#6c6c71"/>`,
    `<text x="48" y="26" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="1.2" fill="#8a8a90">${label.toUpperCase()} · ${name}</text>`,
    `<text x="48" y="48" font-family="ui-sans-serif, system-ui, sans-serif" font-size="17" fill="#ededee">${game}</text>`,
    `</svg>`,
  ].join("");
}

function parseSnapshot(raw: string): Snapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    if (!parsed || typeof parsed !== "object" || !parsed.stats) return null;
    return { stats: parsed.stats, ai: parsed.ai ?? null };
  } catch {
    return null;
  }
}

@Injectable()
export class RewindShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recap: MonthlyRecapService,
    private readonly cache: CacheService,
  ) {}

  async createShare(userId: string, input: RewindShareCreate): Promise<RewindShareCreated> {
    await this.assertUnderCap(userId, SHARE_KIND_REWIND, MAX_ACTIVE_SHARES);
    const timeZone = parseRewindTimeZone(input.tz);
    const stats = await this.recap.statsForDomain(input.domain, userId, input.period, timeZone);
    let ai: Snapshot["ai"] = null;
    if (input.includeAi) {
      const cached = await this.prisma.aiInsightCache.findUnique({
        where: { userId_domain_period: { userId, domain: input.domain, period: input.period } },
      });
      if (cached?.content.trim()) {
        ai = { content: cached.content, generatedAt: cached.updatedAt.toISOString() };
      }
    }
    const snapshot: Snapshot = { stats, ai };
    const { token, prefix, hash } = generateApiToken();
    const row = await this.prisma.rewindShare.create({
      data: {
        userId,
        kind: SHARE_KIND_REWIND,
        domain: input.domain,
        period: input.period,
        tokenHash: hash,
        tokenPrefix: prefix,
        snapshot: JSON.stringify(snapshot),
        theme: input.theme ?? null,
      },
    });
    return { ...this.toShare(row, token), token };
  }

  async listShares(userId: string): Promise<RewindShare[]> {
    const rows = await this.prisma.rewindShare.findMany({
      where: { userId, kind: SHARE_KIND_REWIND, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: SHARE_LIST_LIMIT,
    });
    return rows.map((row) => this.toShare(row, null));
  }

  async revokeShare(userId: string, id: string): Promise<void> {
    await this.revoke(userId, id, SHARE_KIND_REWIND);
  }

  async resolveShare(
    token: string,
    opts: { countView?: boolean } = {},
  ): Promise<PublicRewindShare> {
    const row = await this.lookup(token, SHARE_KIND_REWIND);
    const snapshot = parseSnapshot(row.snapshot);
    if (!snapshot) throw new NotFoundException("Share not found");
    if (opts.countView) await this.countView(row.id);
    return {
      domain: row.domain as PublicRewindShare["domain"],
      period: row.period,
      theme: row.theme,
      stats: snapshot.stats,
      ai: snapshot.ai,
      owner: { personaName: row.user.personaName, avatarUrl: row.user.avatarUrl },
      createdAt: row.createdAt.toISOString(),
    };
  }

  async createBadge(userId: string): Promise<RewindBadgeCreated> {
    await this.assertUnderCap(userId, SHARE_KIND_BADGE, MAX_ACTIVE_BADGES);
    const { token, prefix, hash } = generateApiToken();
    const row = await this.prisma.rewindShare.create({
      data: {
        userId,
        kind: SHARE_KIND_BADGE,
        domain: BADGE_DOMAIN,
        tokenHash: hash,
        tokenPrefix: prefix,
      },
    });
    return { ...this.toBadge(row, token), token };
  }

  async listBadges(userId: string): Promise<RewindBadge[]> {
    const rows = await this.prisma.rewindShare.findMany({
      where: { userId, kind: SHARE_KIND_BADGE, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: SHARE_LIST_LIMIT,
    });
    return rows.map((row) => this.toBadge(row, null));
  }

  async revokeBadge(userId: string, id: string): Promise<void> {
    await this.revoke(userId, id, SHARE_KIND_BADGE);
  }

  async resolveBadge(token: string): Promise<string> {
    const row = await this.lookup(token, SHARE_KIND_BADGE);
    const userId = row.userId;
    const [session, entry] = await Promise.all([
      this.prisma.playSession.findFirst({
        where: {
          userId,
          OR: [
            { gameId: null },
            { game: { libraryEntries: { none: { userId, hidden: true } } } },
          ],
        },
        orderBy: { endedAt: "desc" },
        select: { title: true, endedAt: true, game: { select: { name: true } } },
      }),
      this.prisma.libraryEntry.findFirst({
        where: { userId, hidden: false, lastPlayedAt: { not: null } },
        orderBy: { lastPlayedAt: "desc" },
        select: { lastPlayedAt: true, game: { select: { name: true } } },
      }),
    ]);
    await this.countView(row.id);
    const sessionTitle = session ? (session.game?.name ?? session.title) : null;
    const preferSession =
      session && (!entry?.lastPlayedAt || session.endedAt >= entry.lastPlayedAt);
    const title = preferSession ? sessionTitle : (entry?.game?.name ?? sessionTitle);
    return renderBadgeSvg({ personaName: row.user.personaName, gameTitle: title });
  }

  private async countView(id: string): Promise<void> {
    const writes = await this.cache.incr(`share:views:${id}`, 60);
    if (writes > VIEW_COUNT_WRITES_PER_MINUTE) return;
    await this.prisma.rewindShare.updateMany({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  private async assertUnderCap(userId: string, kind: string, max: number): Promise<void> {
    const active = await this.prisma.rewindShare.count({
      where: { userId, kind, revokedAt: null },
    });
    if (active >= max) {
      throw new BadRequestException(`At most ${max} active links; revoke one first`);
    }
  }

  private async lookup(token: string, kind: string) {
    if (!TOKEN_RE.test(token)) throw new NotFoundException("Share not found");
    const row = await this.prisma.rewindShare.findUnique({
      where: { tokenHash: hashApiToken(token) },
      include: { user: { select: { personaName: true, avatarUrl: true } } },
    });
    if (!row || row.kind !== kind || row.revokedAt) {
      throw new NotFoundException("Share not found");
    }
    return row;
  }

  private async revoke(userId: string, id: string, kind: string): Promise<void> {
    const result = await this.prisma.rewindShare.updateMany({
      where: { id, userId, kind, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Share not found");
  }

  private toShare(row: ShareRow, token: string | null): RewindShare {
    const snapshot = parseSnapshot(row.snapshot);
    return {
      id: row.id,
      domain: row.domain as RewindShare["domain"],
      period: row.period,
      tokenPrefix: row.tokenPrefix,
      theme: row.theme,
      includesAi: Boolean(snapshot?.ai),
      viewCount: row.viewCount,
      createdAt: row.createdAt.toISOString(),
      url: token ? `${webBaseUrl()}/share/rewind/${token}` : `${webBaseUrl()}/share/rewind/${row.tokenPrefix}…`,
    };
  }

  private toBadge(row: ShareRow, token: string | null): RewindBadge {
    const svgUrl = token
      ? `${apiBaseUrl()}/v1/share/badge/${token}.svg`
      : `${apiBaseUrl()}/v1/share/badge/${row.tokenPrefix}….svg`;
    return {
      id: row.id,
      tokenPrefix: row.tokenPrefix,
      viewCount: row.viewCount,
      createdAt: row.createdAt.toISOString(),
      svgUrl,
      markdown: `[![Now playing on Questory](${svgUrl})](${webBaseUrl()})`,
    };
  }
}
