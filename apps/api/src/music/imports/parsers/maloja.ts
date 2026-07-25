import type { ParsedListen } from "./types";

type MalojaItem = {
  time?: number;
  track?: {
    artists?: string[];
    title?: string;
    album?: { albumtitle?: string };
  };
};

/**
 * Maloja export JSON. Artist arrays often look like
 * `['feature', 'main • feature']` — normalize like Koito.
 */
export function parseMalojaJson(text: string): ParsedListen[] {
  const data = JSON.parse(text) as { scrobbles?: MalojaItem[] };
  const scrobbles = Array.isArray(data.scrobbles) ? data.scrobbles : [];
  const out: ParsedListen[] = [];

  for (const item of scrobbles) {
    const rawArtists = Array.isArray(item.track?.artists)
      ? [...item.track.artists]
      : [];
    const title = (item.track?.title || "").trim();
    if (!rawArtists.length || !title) continue;

    // Prefer the entry that contains " • " (main • features), then split.
    const bulletIdx = rawArtists.findIndex((a) => a.includes(" \u2022 "));
    if (bulletIdx > 0) {
      const [hit] = rawArtists.splice(bulletIdx, 1);
      rawArtists.unshift(hit);
    }

    const artists: string[] = [];
    for (const an of rawArtists) {
      for (const part of an.split(" \u2022 ")) {
        const t = part.trim();
        if (t && !artists.some((a) => a.toLowerCase() === t.toLowerCase())) {
          artists.push(t);
        }
      }
    }
    if (!artists.length) continue;

    const unix = typeof item.time === "number" ? item.time : NaN;
    if (!Number.isFinite(unix)) continue;
    const listenedAt = new Date(unix * 1000);
    if (Number.isNaN(listenedAt.getTime())) continue;

    out.push({
      artistName: artists[0],
      trackName: title,
      releaseName: (item.track?.album?.albumtitle || "").trim() || null,
      listenedAt,
      musicService: "maloja",
      submissionClient: "maloja_import",
    });
  }
  return out;
}
