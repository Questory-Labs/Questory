import { cleanMbid, cleanText, parseListenedAt, type ParsedListen } from "./types";

type LastFmPage = {
  track?: LastFmTrack[] | LastFmTrack;
};

type LastFmTrack = {
  artist?: { mbid?: string; "#text"?: string };
  album?: { mbid?: string; "#text"?: string };
  mbid?: string;
  name?: string;
  date?: { uts?: string; "#text"?: string };
};

/** Last.fm JSON from https://lastfm.ghan.nl/export/ (Koito-compatible). */
export function parseLastFmJson(text: string): ParsedListen[] {
  const pages = JSON.parse(text) as LastFmPage[];
  if (!Array.isArray(pages)) {
    throw new Error("Last.fm export must be a JSON array of pages");
  }

  const out: ParsedListen[] = [];
  for (const page of pages) {
    const rawTracks = page?.track;
    const tracks = Array.isArray(rawTracks)
      ? rawTracks
      : rawTracks
        ? [rawTracks]
        : [];
    for (const track of tracks) {
      const trackName = cleanText(track?.name);
      const artistName = cleanText(track?.artist?.["#text"]);
      if (!trackName || !artistName) continue;

      let listenedAt: Date | null = null;
      const uts = track.date?.uts ? Number(track.date.uts) : NaN;
      if (Number.isFinite(uts)) {
        listenedAt = parseListenedAt(uts);
      } else {
        // e.g. "02 Jan 2006, 15:04"
        listenedAt = parseListenedAt(
          cleanText(track.date?.["#text"]).replace(",", ""),
        );
      }
      if (!listenedAt) continue;

      const album = cleanText(track.album?.["#text"]) || trackName;
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
