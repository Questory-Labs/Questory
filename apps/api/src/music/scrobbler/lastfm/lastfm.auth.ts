import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../../../cache/cache.service";
import {
  isLastFmConfigured,
  resolveLastFmApiKey,
  resolveLastFmRedirectUri,
} from "../../lib/runtime-config";
import {
  LASTFM_PROVIDER,
  SCROBBLER_AUTH_TOKEN_TTL_SECONDS,
  lastFmAuthCacheKey,
} from "../scrobbler.constants";
import { ScrobblerConnections } from "../scrobbler.connections";
import { ScrobblerLoop } from "../scrobbler.loop";
import { LastFmClient } from "./lastfm.client";

@Injectable()
export class LastFmAuth {
  private readonly logger = new Logger(LastFmAuth.name);

  constructor(
    private readonly client: LastFmClient,
    private readonly connections: ScrobblerConnections,
    private readonly cache: CacheService,
    private readonly loop: ScrobblerLoop,
  ) {}

  configured() {
    return isLastFmConfigured();
  }

  async authorizeUrl(userId: string, state: string): Promise<string> {
    if (!this.configured()) {
      throw new BadRequestException("LASTFM_API_KEY/SECRET not configured");
    }
    const { token } = await this.client.getToken();
    if (!token) throw new BadRequestException("Last.fm did not return a token");
    await this.cache.setJson(
      lastFmAuthCacheKey(token),
      userId,
      SCROBBLER_AUTH_TOKEN_TTL_SECONDS,
    );
    const cb = new URL(resolveLastFmRedirectUri());
    cb.searchParams.set("state", state);
    const url = new URL("https://www.last.fm/api/auth/");
    url.searchParams.set("api_key", resolveLastFmApiKey());
    url.searchParams.set("token", token);
    url.searchParams.set("cb", cb.toString());
    return url.toString();
  }

  async complete(token: string, userId: string) {
    if (!this.configured()) {
      throw new BadRequestException("LASTFM_API_KEY/SECRET not configured");
    }
    const data = await this.client.getSession(token);
    const sessionKey = data.session?.key;
    const username = data.session?.name;
    if (!sessionKey || !username) {
      throw new BadRequestException("Last.fm session exchange failed");
    }
    await this.connections.upsert({
      userId,
      provider: LASTFM_PROVIDER,
      accessToken: sessionKey,
      externalUserId: username,
    });
    await this.cache.del(lastFmAuthCacheKey(token));
    void this.loop.pollNow(userId, LASTFM_PROVIDER).catch((err) =>
      this.logger.warn(
        `Last.fm catch-up failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    return { ok: true as const, userId, username };
  }

  async resolveUserIdFromToken(token: string): Promise<string | null> {
    const userId = await this.cache.getJson<string>(lastFmAuthCacheKey(token));
    return userId;
  }

  disconnect(userId: string) {
    return this.connections.disconnect(userId, LASTFM_PROVIDER);
  }

  status(userId: string) {
    return this.connections.lastFmStatus(userId);
  }
}
