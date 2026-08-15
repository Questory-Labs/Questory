import { Injectable } from "@nestjs/common";
import {
  LASTFM_CATCHUP_LOOKBACK_MS,
  LASTFM_CATCHUP_MAX_TRACKS,
  LASTFM_POLL_INTERVAL_MS,
  LASTFM_PROVIDER,
  LASTFM_RECENT_LIMIT,
} from "../scrobbler.constants";
import { ScrobblerConnections } from "../scrobbler.connections";
import type {
  ScrobbleObservation,
  ScrobblePollResult,
  ScrobbleSource,
  SourceConn,
} from "../scrobbler.types";
import { isLastFmConfigured } from "../../lib/runtime-config";
import { LastFmApiError, LastFmClient } from "./lastfm.client";
import {
  isNowPlaying,
  mapLastFmTrack,
  trackUts,
  type LastFmRecentTrack,
} from "./lastfm.map";

@Injectable()
export class LastFmSource implements ScrobbleSource {
  readonly id = LASTFM_PROVIDER;
  readonly pollIntervalMs = LASTFM_POLL_INTERVAL_MS;

  constructor(
    private readonly client: LastFmClient,
    private readonly connections: ScrobblerConnections,
  ) {}

  isConfigured() {
    return isLastFmConfigured();
  }

  async ensureSession(conn: SourceConn): Promise<SourceConn> {
    return conn;
  }

  async poll(conn: SourceConn): Promise<ScrobblePollResult> {
    const user = conn.externalUserId;
    if (!user) {
      return { observations: [], error: "missing Last.fm username" };
    }

    const sk = this.connections.sessionKey(conn);
    const from = conn.syncCursor || undefined;
    const catchUp = !conn.syncCursor;
    const limit = catchUp ? LASTFM_CATCHUP_MAX_TRACKS : LASTFM_RECENT_LIMIT;
    const fromTs = catchUp
      ? String(Math.floor((Date.now() - LASTFM_CATCHUP_LOOKBACK_MS) / 1000))
      : from;

    try {
      const tracks = await this.client.getRecentTracks({
        user,
        from: fromTs,
        limit,
        sk,
      });
      return this.toResult(tracks, conn.syncCursor);
    } catch (err) {
      if (err instanceof LastFmApiError && err.authFailed) {
        return { observations: [], authFailed: true, error: err.message };
      }
      throw err;
    }
  }

  private toResult(
    tracks: LastFmRecentTrack[],
    prevCursor: string | null,
  ): ScrobblePollResult {
    const observations: ScrobbleObservation[] = [];
    let maxUts = prevCursor ? Number(prevCursor) : 0;
    if (!Number.isFinite(maxUts)) maxUts = 0;

    for (const track of tracks) {
      if (isNowPlaying(track)) {
        const meta = mapLastFmTrack(track, "playing_now");
        if (meta) observations.push({ kind: "playing_now", meta });
        continue;
      }
      const uts = trackUts(track);
      if (uts == null) continue;
      if (prevCursor && uts <= Number(prevCursor)) continue;
      const meta = mapLastFmTrack(track, "listen");
      if (!meta) continue;
      observations.push({ kind: "listen", meta });
      if (uts > maxUts) maxUts = uts;
    }

    return {
      observations,
      nextCursor: String(maxUts > 0 ? maxUts : Math.floor(Date.now() / 1000)),
    };
  }
}
