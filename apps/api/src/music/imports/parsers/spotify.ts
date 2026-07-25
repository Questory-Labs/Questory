import type { ParsedListen } from "./types";

type SpotifyItem = {
  ts?: string;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  reason_end?: string | null;
  ms_played?: number | null;
};

/** Spotify extended streaming history JSON (Koito-compatible). */
export function parseSpotifyJson(text: string): ParsedListen[] {
  const data = JSON.parse(text) as SpotifyItem[];
  if (!Array.isArray(data)) {
    throw new Error("Spotify export must be a JSON array");
  }

  const out: ParsedListen[] = [];
  for (const item of data) {
    if (item.reason_end !== "trackdone") continue;
    const trackName = (item.master_metadata_track_name || "").trim();
    const artistName = (item.master_metadata_album_artist_name || "").trim();
    if (!trackName || !artistName) continue;

    const listenedAt = item.ts ? new Date(item.ts) : null;
    if (!listenedAt || Number.isNaN(listenedAt.getTime())) continue;

    const msPlayed =
      typeof item.ms_played === "number" && item.ms_played > 0
        ? item.ms_played
        : null;

    out.push({
      artistName,
      trackName,
      releaseName: (item.master_metadata_album_album_name || "").trim() || null,
      listenedAt,
      durationMs: msPlayed,
      musicService: "spotify",
      submissionClient: "spotify_import",
    });
  }
  return out;
}
