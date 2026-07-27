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

export function primaryAlias(
  aliases: Array<{ alias?: string; is_primary?: boolean }> | undefined,
): string {
  if (!aliases?.length) return "";
  const primary = aliases.find((a) => a.is_primary && a.alias?.trim());
  if (primary?.alias) return primary.alias.trim();
  const first = aliases.find((a) => a.alias?.trim());
  return first?.alias?.trim() ?? "";
}
