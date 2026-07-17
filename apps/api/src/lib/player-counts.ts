/**
 * Player capacity derivation.
 * Primary: IGDB multiplayer_modes (structured max fields).
 * Fallback: Steam store tags with an explicit numbered count only.
 * Never invent ranges from generic "Multiplayer" labels.
 *
 * IGDB distinguishes party/lobby size (*coopmax) from match-wide size (*max).
 * For "play with friends" we prefer lobby/party counts — e.g. Apex squad of 3,
 * not the 60-player match that includes enemy squads.
 */

export type PlayerCountsResult = {
  /** Floor for range filters only — never shown as a "2+" chip. */
  minPlayers: number;
  maxPlayers: number;
  /** Distinct party/lobby maxes for display, e.g. [3, 5, 8] → MAX:3/5/8 */
  playerMaxes: number[];
  source: "igdb" | "steam_tag";
};

export type IgdbMultiplayerMode = {
  offlinecoopmax?: number | null;
  offlinemax?: number | null;
  onlinecoopmax?: number | null;
  onlinemax?: number | null;
  platform?: number | null;
  offlinecoop?: boolean | null;
  onlinecoop?: boolean | null;
  splitscreen?: boolean | null;
};

/** IGDB platform id for PC (Windows). */
const IGDB_PLATFORM_PC = 6;

const EXPLICIT_TAG_COUNTS: Record<string, { min: number; max: number }> = {
  "4 player local": { min: 2, max: 4 },
  "2 player local": { min: 2, max: 2 },
  "8-player local": { min: 2, max: 8 },
  "8 player local": { min: 2, max: 8 },
};

function positiveInts(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0,
  );
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Prefer party/lobby (*coopmax) over match-wide (*max) when both exist.
 * Match caps include enemies and are not useful for friend planning.
 */
function preferPartyMaxes(
  coopMaxes: number[],
  matchMaxes: number[],
): number[] {
  if (coopMaxes.length) return coopMaxes;
  return matchMaxes;
}

/** Poster/sidebar label: MAX:5 or MAX:3/5/8 */
export function formatPlayerMaxLabel(maxes: number[] | null | undefined): string | null {
  if (!maxes?.length) return null;
  const cleaned = uniqueSorted(
    maxes.filter((n) => Number.isFinite(n) && n > 0),
  );
  if (!cleaned.length) return null;
  return `MAX:${cleaned.join("/")}`;
}

export function deriveFromIgdbModes(
  modes: IgdbMultiplayerMode[],
  preferredMode?: "local_coop" | "online_coop" | "pvp" | "crossplay",
): PlayerCountsResult | null {
  if (!modes.length) return null;

  const pcModes = modes.filter((m) => m.platform === IGDB_PLATFORM_PC);
  const pool = pcModes.length ? pcModes : modes;

  const coopMaxes = uniqueSorted(
    positiveInts(
      pool.flatMap((m) => [m.offlinecoopmax, m.onlinecoopmax]),
    ),
  );
  const matchMaxes = uniqueSorted(
    positiveInts(pool.flatMap((m) => [m.offlinemax, m.onlinemax])),
  );
  const partyMaxes = preferPartyMaxes(coopMaxes, matchMaxes);
  if (!partyMaxes.length) return null;

  const pickForMode = (): number[] => {
    switch (preferredMode) {
      case "local_coop":
        return preferPartyMaxes(
          uniqueSorted(
            positiveInts(pool.flatMap((m) => [m.offlinecoopmax])),
          ),
          uniqueSorted(positiveInts(pool.flatMap((m) => [m.offlinemax]))),
        );
      case "online_coop":
        return preferPartyMaxes(
          uniqueSorted(
            positiveInts(pool.flatMap((m) => [m.onlinecoopmax])),
          ),
          uniqueSorted(positiveInts(pool.flatMap((m) => [m.onlinemax]))),
        );
      case "pvp": {
        // Squad/party size when present (Apex trio); else full match (CS 10).
        return preferPartyMaxes(
          uniqueSorted(
            positiveInts(pool.flatMap((m) => [m.onlinecoopmax])),
          ),
          uniqueSorted(positiveInts(pool.flatMap((m) => [m.onlinemax]))),
        );
      }
      default:
        return partyMaxes;
    }
  };

  let filterMaxes = uniqueSorted(pickForMode());
  if (!filterMaxes.length) filterMaxes = partyMaxes;

  const maxPlayers = Math.max(...filterMaxes);
  const minPlayers = maxPlayers >= 2 ? 2 : 1;
  return {
    minPlayers,
    maxPlayers,
    playerMaxes: partyMaxes,
    source: "igdb",
  };
}

/** Exact numbered Steam tags only — no generic Multiplayer → 2+ inventing. */
export function playerCountsFromTagNames(
  tags: string[],
  categories: string[] = [],
): PlayerCountsResult | null {
  let maxPlayers: number | null = null;

  for (const raw of [...tags, ...categories]) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;

    const known = EXPLICIT_TAG_COUNTS[tag];
    if (known) {
      maxPlayers =
        maxPlayers == null ? known.max : Math.max(maxPlayers, known.max);
      continue;
    }

    const numbered = tag.match(/\b(\d+)\s*-?\s*players?\b/);
    if (numbered) {
      const n = Number(numbered[1]);
      if (n >= 2 && n <= 64) {
        maxPlayers = maxPlayers == null ? n : Math.max(maxPlayers, n);
      }
    }
  }

  if (maxPlayers == null) return null;
  return {
    minPlayers: maxPlayers >= 2 ? 2 : 1,
    maxPlayers,
    playerMaxes: [maxPlayers],
    source: "steam_tag",
  };
}

export function playerFilterMatches(
  gameMin: number | null,
  gameMax: number | null,
  filterMin: number,
  filterMax: number,
  playerMaxes?: number[] | null,
): boolean {
  // Unknown capacity: keep in results (lenient).
  if (
    gameMin == null &&
    gameMax == null &&
    (!playerMaxes || playerMaxes.length === 0)
  ) {
    return true;
  }
  if (playerMaxes?.length) {
    // Match if any mode max sits in the filter window (or above min when open-ended).
    return playerMaxes.some((m) => m >= filterMin && m <= filterMax);
  }
  const gMin = gameMin ?? 2;
  const gMax = gameMax ?? Number.POSITIVE_INFINITY;
  return gMin <= filterMax && filterMin <= gMax;
}

export const PLAYER_COUNT_STALE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cached counts synced before this must re-derive.
 * Advance when lobby-vs-match derivation rules change.
 */
export const PLAYER_COUNT_DERIVATION_CUTOFF_MS = Date.parse(
  "2026-07-17T11:00:00.000Z",
);

export function isPlayerCountFresh(
  syncedAt: Date | string | null | undefined,
): boolean {
  if (!syncedAt) return false;
  const t =
    syncedAt instanceof Date ? syncedAt.getTime() : new Date(syncedAt).getTime();
  if (Number.isNaN(t)) return false;
  if (t < PLAYER_COUNT_DERIVATION_CUTOFF_MS) return false;
  return Date.now() - t < PLAYER_COUNT_STALE_MS;
}

export function parsePlayerMaxes(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueSorted(
      parsed.filter(
        (n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0,
      ),
    );
  } catch {
    return [];
  }
}

export function stringifyPlayerMaxes(maxes: number[]): string {
  return JSON.stringify(uniqueSorted(maxes));
}
