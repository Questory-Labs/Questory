import type { SteamPlayerSummary } from "../steam/steam-api.service";

export type FriendPresence = {
  personaState: number | null;
  currentAppId: number | null;
  currentGameName: string | null;
  lastLogoffAt: Date | null;
  presenceSyncedAt: Date;
};

export function friendPresenceFromSummary(
  summary: SteamPlayerSummary | undefined,
  syncedAt: Date,
): FriendPresence {
  const appId = summary?.gameid ? Number.parseInt(summary.gameid, 10) : NaN;
  const validAppId =
    Number.isSafeInteger(appId) && appId > 0 && appId <= 2_147_483_647;
  return {
    personaState:
      typeof summary?.personastate === "number" ? summary.personastate : null,
    currentAppId: validAppId ? appId : null,
    currentGameName: validAppId
      ? summary?.gameextrainfo?.slice(0, 200) || null
      : null,
    lastLogoffAt:
      typeof summary?.lastlogoff === "number" && summary.lastlogoff > 0
        ? new Date(summary.lastlogoff * 1000)
        : null,
    presenceSyncedAt: syncedAt,
  };
}

export function isOnlinePersonaState(state: number | null | undefined) {
  return typeof state === "number" && state > 0;
}
