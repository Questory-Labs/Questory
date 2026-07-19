import { cleanMbid, primaryAlias, type ParsedListen } from "./types";

type KoitoExportListen = {
  listened_at?: string;
  client?: string;
  track?: {
    mbid?: string | null;
    duration?: number;
    aliases?: Array<{ alias?: string; is_primary?: boolean }>;
  };
  album?: {
    mbid?: string | null;
    aliases?: Array<{ alias?: string; is_primary?: boolean }>;
  };
  artists?: Array<{
    mbid?: string | null;
    is_primary?: boolean;
    aliases?: Array<{ alias?: string; is_primary?: boolean }>;
  }>;
};

/** Official Koito JSON export (`version: "1"`). */
export function parseKoitoJson(text: string): ParsedListen[] {
  const data = JSON.parse(text) as {
    version?: string;
    listens?: KoitoExportListen[];
  };
  if (data.version != null && data.version !== "1") {
    throw new Error(`Unsupported Koito export version: ${data.version}`);
  }
  const listens = Array.isArray(data.listens) ? data.listens : [];
  const out: ParsedListen[] = [];

  for (const item of listens) {
    const trackName = primaryAlias(item.track?.aliases);
    const artists = Array.isArray(item.artists) ? item.artists : [];
    const primaryArtist =
      artists.find((a) => a.is_primary) || artists[0] || null;
    const artistName = primaryAlias(primaryArtist?.aliases);
    if (!trackName || !artistName) continue;

    const listenedAt = item.listened_at ? new Date(item.listened_at) : null;
    if (!listenedAt || Number.isNaN(listenedAt.getTime())) continue;

    const artistMbids = artists
      .map((a) => cleanMbid(a.mbid))
      .filter((x): x is string => !!x);

    const durationSec =
      typeof item.track?.duration === "number" ? item.track.duration : 0;

    out.push({
      artistName,
      trackName,
      releaseName: primaryAlias(item.album?.aliases) || null,
      listenedAt,
      recordingMbid: cleanMbid(item.track?.mbid),
      releaseMbid: cleanMbid(item.album?.mbid),
      artistMbids: artistMbids.length ? artistMbids : undefined,
      durationMs: durationSec > 0 ? durationSec * 1000 : null,
      musicService: (item.client || "").trim() || "koito",
      submissionClient: "koito_import",
    });
  }
  return out;
}
