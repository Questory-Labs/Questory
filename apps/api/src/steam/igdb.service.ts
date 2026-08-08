import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";
import { providerFetch } from "../lib/qhttp-outbound";
import {
  deriveFromIgdbModes,
  type IgdbMultiplayerMode,
  type PlayerCountsResult,
} from "../lib/player-counts";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

@Injectable()
export class IgdbService {
  private readonly logger = new Logger(IgdbService.name);
  private memoryToken: TokenCache | null = null;
  private lastRequestAt = 0;

  constructor(private readonly cache: CacheService) {}

  private get clientId() {
    return (
      process.env.IGDB_CLIENT_ID ||
      process.env.TWITCH_CLIENT_ID ||
      ""
    ).trim();
  }

  private get clientSecret() {
    return (
      process.env.IGDB_CLIENT_SECRET ||
      process.env.TWITCH_CLIENT_SECRET ||
      ""
    ).trim();
  }

  get configured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  /** Simple spacing to stay under IGDB's 4 req/s limit. */
  private async throttle() {
    const minGapMs = 260;
    const wait = Math.max(0, this.lastRequestAt + minGapMs - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestAt = Date.now();
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.configured) return null;

    const cached = await this.cache.getJson<TokenCache>("igdb:token");
    if (cached?.accessToken && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }
    if (
      this.memoryToken?.accessToken &&
      this.memoryToken.expiresAt > Date.now() + 60_000
    ) {
      return this.memoryToken.accessToken;
    }

    await this.throttle();
    const url = new URL("https://id.twitch.tv/oauth2/token");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("client_secret", this.clientSecret);
    url.searchParams.set("grant_type", "client_credentials");

    try {
      const res = await providerFetch(url.toString(), { method: "POST" });
      const text = await res.text();
      if (!res.ok) {
        this.logger.warn(`IGDB token failed ${res.status}: ${text.slice(0, 200)}`);
        return null;
      }
      const data = JSON.parse(text) as {
        access_token: string;
        expires_in: number;
      };
      const entry: TokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
      this.memoryToken = entry;
      await this.cache.setJson(
        "igdb:token",
        entry,
        Math.max(60, (data.expires_in || 3600) - 120),
      );
      return entry.accessToken;
    } catch (err) {
      this.logger.warn(`IGDB token error: ${err}`);
      return null;
    }
  }

  private async igdbPost<T>(endpoint: string, body: string): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    await this.throttle();
    try {
      const res = await providerFetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": this.clientId,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "text/plain",
        },
        body,
      });
      const text = await res.text();
      if (!res.ok) {
        this.logger.warn(
          `IGDB ${endpoint} ${res.status}: ${text.slice(0, 200)}`,
        );
        return null;
      }
      return JSON.parse(text) as T;
    } catch (err) {
      this.logger.warn(`IGDB ${endpoint} error: ${err}`);
      return null;
    }
  }

  async resolveSteamAppId(steamAppId: number): Promise<number | null> {
    const cacheKey = `igdb:steam:${steamAppId}`;
    const cached = await this.cache.getJson<{ gameId: number | null }>(cacheKey);
    if (cached) return cached.gameId;

    const rows = await this.igdbPost<{ game?: number }[]>(
      "external_games",
      `fields game,uid,external_game_source,category;
where uid = "${steamAppId}" & (external_game_source = 1 | category = 1);
limit 1;`,
    );
    const gameId = rows?.[0]?.game ?? null;
    await this.cache.setJson(cacheKey, { gameId }, 86400 * 7);
    return gameId;
  }

  async getMultiplayerModes(
    igdbGameId: number,
  ): Promise<IgdbMultiplayerMode[]> {
    const cacheKey = `igdb:mpmodes:${igdbGameId}`;
    const cached = await this.cache.getJson<IgdbMultiplayerMode[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.igdbPost<IgdbMultiplayerMode[]>(
      "multiplayer_modes",
      `fields campaigncoop,dropin,game,lancoop,offlinecoop,offlinecoopmax,offlinemax,onlinecoop,onlinecoopmax,onlinemax,platform,splitscreen,splitscreenonline;
where game = ${igdbGameId};
limit 50;`,
    );
    const modes = rows || [];
    await this.cache.setJson(cacheKey, modes, 86400 * 7);
    return modes;
  }

  async getPlayerCountsForSteamApp(
    steamAppId: number,
    preferredMode?:
      | "local_coop"
      | "online_coop"
      | "pvp"
      | "crossplay"
      | null,
  ): Promise<PlayerCountsResult | null> {
    if (!this.configured) return null;

    const gameId = await this.resolveSteamAppId(steamAppId);
    if (!gameId) return null;

    const modes = await this.getMultiplayerModes(gameId);
    return deriveFromIgdbModes(modes, preferredMode ?? undefined);
  }
}
