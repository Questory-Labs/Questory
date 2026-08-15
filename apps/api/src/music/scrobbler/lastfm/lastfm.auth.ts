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
  lastFmPendingCacheKey,
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

  async authorizeUrl(userId: string): Promise<string> {
    if (!this.configured()) {
      throw new BadRequestException(
        "LASTFM_API_KEY, LASTFM_API_SECRET, and LASTFM_REDIRECT_URI must be set",
      );
    }
    const { token } = await this.client.getToken();
    if (!token) throw new BadRequestException("Last.fm did not return a token");
    await this.cache.setJson(
      lastFmAuthCacheKey(token),
      userId,
      SCROBBLER_AUTH_TOKEN_TTL_SECONDS,
    );
    await this.cache.setJson(
      lastFmPendingCacheKey(userId),
      token,
      SCROBBLER_AUTH_TOKEN_TTL_SECONDS,
    );
    // Last.fm only redirects if `cb` matches the API-account Callback URL exactly.
    // Extra query params (e.g. state) make it show "close your browser" instead.
    const url = new URL("https://www.last.fm/api/auth/");
    url.searchParams.set("api_key", resolveLastFmApiKey());
    url.searchParams.set("token", token);
    url.searchParams.set("cb", resolveLastFmRedirectUri());
    return url.toString();
  }

  async complete(token: string, userId: string) {
    if (!this.configured()) {
      throw new BadRequestException("LASTFM_API_KEY, LASTFM_API_SECRET, and LASTFM_REDIRECT_URI must be set");
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
    await this.cache.del(lastFmPendingCacheKey(userId));
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

  async status(userId: string) {
    await this.finishPending(userId);
    return this.connections.lastFmStatus(userId);
  }

  /** Last.fm often leaves you on their "close the browser" page. Finish when you come back. */
  private async finishPending(userId: string): Promise<void> {
    const token = await this.cache.getJson<string>(lastFmPendingCacheKey(userId));
    if (!token) return;
    try {
      await this.complete(token, userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Last.fm pending session not ready: ${message}`);
    }
  }
}
