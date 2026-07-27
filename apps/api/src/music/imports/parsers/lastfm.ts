import { cleanMbid, type ParsedListen } from "./types";

type LastFmPage = {
  track?: Array<{
    artist?: { mbid?: string; "#text"?: string };
    album?: { mbid?: string; "#text"?: string };
    mbid?: string;
    name?: string;
    date?: { uts?: string; "#text"?: string };
  }>;
};

/** Last.fm JSON from https://lastfm.ghan.nl/export/ (Koito-compatible). */
export function parseLastFmJson(text: string): ParsedListen[] {
  const pages = JSON.parse(text) as LastFmPage[];
  if (!Array.isArray(pages)) {
    throw new Error("Last.fm export must be a JSON array of pages");
  }

  const out: ParsedListen[] = [];
  for (const page of pages) {
    for (const track of page.track || []) {
      const trackName = (track.name || "").trim();
      const artistName = (track.artist?.["#text"] || "").trim();
      if (!trackName || !artistName) continue;

      let listenedAt: Date | null = null;
      const uts = track.date?.uts ? Number(track.date.uts) : NaN;
      if (Number.isFinite(uts)) {
        listenedAt = new Date(uts * 1000);
      } else if (track.date?.["#text"]) {
        // e.g. "02 Jan 2006, 15:04"
        const parsed = Date.parse(
          track.date["#text"].replace(",", ""),
        );
        if (Number.isFinite(parsed)) listenedAt = new Date(parsed);
      }
      if (!listenedAt || Number.isNaN(listenedAt.getTime())) continue;

      const album = (track.album?.["#text"] || "").trim() || trackName;
      const artistMbid = cleanMbid(track.artist?.mbid);
      const recordingMbid = cleanMbid(track.mbid);
      const releaseMbid = cleanMbid(track.album?.mbid);

      out.push({
        artistName,
        trackName,
        releaseName: album,
        listenedAt,
        recordingMbid,
        releaseMbid,
        artistMbids: artistMbid ? [artistMbid] : undefined,
        musicService: "lastfm",
        submissionClient: "lastfm_import",
      });
    }
  }
  return out;
}
