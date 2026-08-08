import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { providerFetch } from "../lib/qhttp-outbound";

export type OnlinePlayersPoint = { date: string; players: number };

export type OnlinePlayersStats = {
  current: number | null;
  peak24h: number | null;
  peakAllTime: number | null;
  history: OnlinePlayersPoint[];
};

type SteamChartsPayload = {
  current: number | null;
  peak24h: number | null;
  peakAllTime: number | null;
  history: OnlinePlayersPoint[];
};

@Injectable()
export class ConcurrentPlayersService {
  private readonly logger = new Logger(ConcurrentPlayersService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getForApp(appId: number): Promise<OnlinePlayersStats | null> {
    if (!Number.isFinite(appId) || appId <= 0) return null;

    const cacheKey = `players:online:v2:${appId}`;
    const cached = await this.cache.getJson<OnlinePlayersStats>(cacheKey);
    if (cached) return cached;

    const game = await this.prisma.game.findFirst({
      where: { appId },
      select: {
        playersOnlinePeak: true,
        playersOnlinePeakAt: true,
      },
    });

    const [steamCurrent, charts] = await Promise.all([
      this.fetchSteamCurrent(appId),
      this.fetchSteamCharts(appId),
    ]);

    const current =
      steamCurrent ?? charts?.current ?? null;

    let peak24h = charts?.peak24h ?? null;
    if (peak24h == null && current != null) peak24h = current;

    let peakAllTime =
      charts?.peakAllTime ?? game?.playersOnlinePeak ?? null;
    if (current != null) {
      peakAllTime =
        peakAllTime == null ? current : Math.max(peakAllTime, current);
    }

    const history = charts?.history?.length
      ? charts.history
      : current != null
        ? await this.appendLocalSample(appId, current)
        : [];

    if (peakAllTime != null) {
      const shouldPersist =
        game?.playersOnlinePeak == null ||
        peakAllTime > (game.playersOnlinePeak ?? 0);
      if (shouldPersist) {
        await this.prisma.game
          .updateMany({
            where: { appId },
            data: {
              playersOnlinePeak: peakAllTime,
              playersOnlinePeakAt: new Date(),
            },
          })
          .catch(() => undefined);
      }
    }

    if (current == null && peakAllTime == null && history.length === 0) {
      return null;
    }

    const result: OnlinePlayersStats = {
      current,
      peak24h,
      peakAllTime,
      history,
    };
    await this.cache.setJson(cacheKey, result, 120);
    return result;
  }

  private async fetchSteamCurrent(appId: number): Promise<number | null> {
    const cacheKey = `players:steam-ccu:${appId}`;
    const cached = await this.cache.getJson<{ n: number }>(cacheKey);
    if (cached?.n != null) return cached.n;

    try {
      const data = await this.fetchJsonWithTimeout<{
        response?: { player_count?: number; result?: number };
      }>(
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
        8000,
      );
      const n = data.response?.player_count;
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
      await this.cache.setJson(cacheKey, { n }, 60);
      return n;
    } catch (err) {
      this.logger.warn(`Steam CCU for ${appId} failed: ${err}`);
      return null;
    }
  }

  private async fetchSteamCharts(
    appId: number,
  ): Promise<SteamChartsPayload | null> {
    const cacheKey = `players:steamcharts:v1:${appId}`;
    const cached = await this.cache.getJson<SteamChartsPayload | { miss: true }>(
      cacheKey,
    );
    if (cached) {
      if ("miss" in cached) return null;
      return cached;
    }

    try {
      const raw = await this.fetchJsonWithTimeout<[number, number][]>(
        `https://steamcharts.com/app/${appId}/chart-data.json`,
        3500,
        {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; QuestoryLabs/1.0; +https://questorylabs.com)",
          Referer: `https://steamcharts.com/app/${appId}`,
        },
      );

      if (!Array.isArray(raw) || raw.length < 2) {
        await this.cache.setJson(cacheKey, { miss: true }, 900);
        return null;
      }

      const points = raw
        .filter(
          (row) =>
            Array.isArray(row) &&
            typeof row[0] === "number" &&
            typeof row[1] === "number",
        )
        .map(([ms, players]) => ({ ms, players: Math.max(0, Math.round(players)) }));

      if (points.length < 2) {
        await this.cache.setJson(cacheKey, { miss: true }, 900);
        return null;
      }

      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const peakAllTime = Math.max(...points.map((p) => p.players));
      const lastDay = points.filter((p) => p.ms >= dayAgo);
      const peak24h = Math.max(
        ...(lastDay.length ? lastDay : points.slice(-24)).map((p) => p.players),
      );
      const current = points[points.length - 1]?.players ?? null;

      const history = this.downsample(
        points.map((p) => ({
          date: new Date(p.ms).toISOString(),
          players: p.players,
        })),
        72,
      );

      const payload: SteamChartsPayload = {
        current,
        peak24h,
        peakAllTime,
        history,
      };
      await this.cache.setJson(cacheKey, payload, 3600);
      return payload;
    } catch (err) {
      this.logger.warn(`SteamCharts for ${appId} failed: ${err}`);
      await this.cache.setJson(cacheKey, { miss: true }, 900);
      return null;
    }
  }

  /** Keep a short local sparkline when SteamCharts is unreachable. */
  private async appendLocalSample(
    appId: number,
    current: number,
  ): Promise<OnlinePlayersPoint[]> {
    const key = `players:local-history:${appId}`;
    const existing =
      (await this.cache.getJson<OnlinePlayersPoint[]>(key)) || [];
    const nowIso = new Date().toISOString();
    const last = existing[existing.length - 1];
    const next =
      last && Date.now() - Date.parse(last.date) < 15 * 60 * 1000
        ? [...existing.slice(0, -1), { date: nowIso, players: current }]
        : [...existing, { date: nowIso, players: current }].slice(-72);
    await this.cache.setJson(key, next, 86400 * 14);
    return next;
  }

  private downsample(
    points: OnlinePlayersPoint[],
    maxPoints: number,
  ): OnlinePlayersPoint[] {
    if (points.length <= maxPoints) return points;
    const out: OnlinePlayersPoint[] = [];
    const step = (points.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.round(i * step);
      out.push(points[idx]);
    }
    return out;
  }

  private async fetchJsonWithTimeout<T>(
    url: string,
    timeoutMs: number,
    headers?: Record<string, string>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await providerFetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "QuestoryLabs/1.0",
          ...headers,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
