import type { IncomingListenMeta } from "../../catalog/catalog.service";

export type LastFmRecentTrack = {
  name?: string;
  mbid?: string;
  artist?: {
    mbid?: string;
    name?: string;
    "#text"?: string;
  };
  album?: {
    mbid?: string;
    "#text"?: string;
  };
  date?: { uts?: string };
  "@attr"?: { nowplaying?: string };
};

export function asTrackArray(
  track: LastFmRecentTrack | LastFmRecentTrack[] | undefined,
): LastFmRecentTrack[] {
  if (!track) return [];
  return Array.isArray(track) ? track : [track];
}

export function isNowPlaying(track: LastFmRecentTrack): boolean {
  const flag = track["@attr"]?.nowplaying;
  return flag === "true" || flag === "1";
}

function artistName(track: LastFmRecentTrack): string {
  return (track.artist?.name || track.artist?.["#text"] || "").trim();
}

export function mapLastFmTrack(
  track: LastFmRecentTrack,
  kind: "playing_now" | "listen",
): IncomingListenMeta | null {
  const trackName = (track.name || "").trim();
  const artist = artistName(track);
  if (!trackName || !artist) return null;

  let listenedAt = new Date();
  if (kind === "listen") {
    const uts = track.date?.uts ? Number(track.date.uts) : NaN;
    if (!Number.isFinite(uts) || uts <= 0) return null;
    listenedAt = new Date(uts * 1000);
  }

  const album = (track.album?.["#text"] || "").trim() || null;
  const artistMbid = (track.artist?.mbid || "").trim() || null;
  const recordingMbid = (track.mbid || "").trim() || null;
  const releaseMbid = (track.album?.mbid || "").trim() || null;

  return {
    artistName: artist,
    trackName,
    releaseName: album,
    listenedAt,
    listenType: kind === "playing_now" ? "playing_now" : "single",
    recordingMbid,
    releaseMbid,
    artistMbids: artistMbid ? [artistMbid] : undefined,
    musicService: "lastfm",
    submissionClient: "questory_lastfm",
  };
}

export function trackUts(track: LastFmRecentTrack): number | null {
  const uts = track.date?.uts ? Number(track.date.uts) : NaN;
  if (!Number.isFinite(uts) || uts <= 0) return null;
  return uts;
}
