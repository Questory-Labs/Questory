export type ImportSource =
  | "koito_db"
  | "koito_json"
  | "spotify_json"
  | "maloja_json"
  | "lastfm_json"
  | "listenbrainz_zip";

export type ParsedListen = {
  artistName: string;
  trackName: string;
  releaseName?: string | null;
  listenedAt: Date;
  recordingMbid?: string | null;
  releaseMbid?: string | null;
  artistMbids?: string[];
  durationMs?: number | null;
  musicService?: string | null;
  mediaPlayer?: string | null;
  submissionClient?: string | null;
};

export function cleanMbid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // UUID-ish MusicBrainz ids
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    return null;
  }
  return trimmed.toLowerCase();
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function primaryAlias(
  aliases: Array<{ alias?: string; is_primary?: boolean }> | undefined,
): string {
  if (!Array.isArray(aliases)) return "";
  const primary = aliases.find((a) => a?.is_primary && cleanText(a.alias));
  if (primary) return cleanText(primary.alias);
  return cleanText(aliases.find((a) => cleanText(a?.alias))?.alias);
}

const MIN_LISTENED_AT_MS = Date.UTC(2000, 0, 1);
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
const UNIX_MS_THRESHOLD = 1e11;

export function parseListenedAt(value: unknown): Date | null {
  let ms: number;
  if (typeof value === "number") {
    ms = Math.abs(value) >= UNIX_MS_THRESHOLD ? value : value * 1000;
  } else if (typeof value === "string") {
    ms = Date.parse(value);
  } else {
    return null;
  }
  if (!Number.isFinite(ms)) return null;
  if (ms < MIN_LISTENED_AT_MS || ms > Date.now() + MAX_FUTURE_SKEW_MS) {
    return null;
  }
  return new Date(ms);
}

export class ImportParseError extends Error {}

export function isFsError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as NodeJS.ErrnoException).syscall === "string"
  );
}
