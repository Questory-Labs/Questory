import { unzipSync, strFromU8 } from "fflate";
import { cleanMbid, type ParsedListen } from "./types";

type LbLine = {
  listened_at?: number;
  track_metadata?: {
    artist_name?: string;
    track_name?: string;
    release_name?: string;
    additional_info?: {
      artist_mbids?: string[];
      release_mbid?: string;
      release_group_mbid?: string;
      recording_mbid?: string;
      duration?: number;
      duration_ms?: number;
      media_player?: string;
      submission_client?: string;
      music_service?: string;
      artist_names?: string[];
    };
    mbid_mapping?: {
      artist_mbids?: string[];
      release_mbid?: string;
      recording_mbid?: string;
      artists?: Array<{ artist_mbid?: string; artist_name?: string }>;
    };
  };
};

function parseJsonl(text: string): ParsedListen[] {
  const out: ParsedListen[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let payload: LbLine;
    try {
      payload = JSON.parse(trimmed) as LbLine;
    } catch {
      continue;
    }

    const meta = payload.track_metadata;
    const artistName = (meta?.artist_name || "").trim();
    const trackName = (meta?.track_name || "").trim();
    if (!artistName || !trackName) continue;

    const unix =
      typeof payload.listened_at === "number" ? payload.listened_at : NaN;
    if (!Number.isFinite(unix)) continue;
    const listenedAt = new Date(unix * 1000);
    if (Number.isNaN(listenedAt.getTime())) continue;

    const info = meta?.additional_info;
    const mapping = meta?.mbid_mapping;

    const artistMbids = (info?.artist_mbids || mapping?.artist_mbids || [])
      .map(cleanMbid)
      .filter((x): x is string => !!x);

    const recordingMbid =
      cleanMbid(info?.recording_mbid) || cleanMbid(mapping?.recording_mbid);
    const releaseMbid =
      cleanMbid(info?.release_mbid) || cleanMbid(mapping?.release_mbid);

    let durationMs: number | null = null;
    if (typeof info?.duration_ms === "number" && info.duration_ms > 0) {
      durationMs = info.duration_ms;
    } else if (typeof info?.duration === "number" && info.duration > 0) {
      durationMs = info.duration * 1000;
    }

    out.push({
      artistName,
      trackName,
      releaseName: (meta?.release_name || "").trim() || null,
      listenedAt,
      recordingMbid,
      releaseMbid,
      artistMbids: artistMbids.length ? artistMbids : undefined,
      durationMs,
      mediaPlayer: info?.media_player || null,
      submissionClient: info?.submission_client || "listenbrainz_import",
      musicService: info?.music_service || "listenbrainz",
    });
  }
  return out;
}

/** ListenBrainz website export zip (listens/…/*.jsonl). */
export function parseListenBrainzZip(buffer: Buffer): ParsedListen[] {
  const files = unzipSync(new Uint8Array(buffer));
  const out: ParsedListen[] = [];

  for (const [name, data] of Object.entries(files)) {
    const normalized = name.replace(/\\/g, "/");
    if (!normalized.includes("listens/") || !normalized.endsWith(".jsonl")) {
      continue;
    }
    out.push(...parseJsonl(strFromU8(data)));
  }

  if (!out.length) {
    throw new Error(
      "ListenBrainz zip contained no listens/*.jsonl files",
    );
  }
  return out;
}
