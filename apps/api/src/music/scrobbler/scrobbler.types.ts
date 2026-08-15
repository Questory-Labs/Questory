import type { IncomingListenMeta } from "../catalog/catalog.service";
import type { MusicScrobblerProviderId } from "./scrobbler.constants";

export type SourceConn = {
  id: string;
  userId: string;
  provider: string;
  externalUserId: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  syncCursor: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
};

export type ScrobbleObservation =
  | { kind: "playing_now"; meta: IncomingListenMeta }
  | { kind: "listen"; meta: IncomingListenMeta };

export type ScrobblePollResult = {
  observations: ScrobbleObservation[];
  nextCursor?: string | null;
  authFailed?: boolean;
  error?: string | null;
};

export interface ScrobbleSource {
  readonly id: MusicScrobblerProviderId;
  readonly pollIntervalMs: number;
  isConfigured(): boolean;
  ensureSession(conn: SourceConn): Promise<SourceConn>;
  poll(conn: SourceConn): Promise<ScrobblePollResult>;
}
