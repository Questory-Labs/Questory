import { unzipSync, strFromU8 } from "fflate";
import { cleanMbid, cleanText, parseListenedAt, type ParsedListen } from "./types";

const MAX_INFLATED_BYTES = 1024 * 1024 * 1024;

function cleanMbids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanMbid).filter((x): x is string => !!x);
}

function isListensEntry(name: string): boolean {
  const normalized = name.replace(/\\/g, "/");
  return normalized.includes("listens/") && normalized.endsWith(".jsonl");
}

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

    const meta = payload?.track_metadata;
    const artistName = cleanText(meta?.artist_name);
    const trackName = cleanText(meta?.track_name);
    if (!artistName || !trackName) continue;

    const listenedAt =
      typeof payload.listened_at === "number"
        ? parseListenedAt(payload.listened_at)
        : null;
    if (!listenedAt) continue;

    const info = meta?.additional_info;
    const mapping = meta?.mbid_mapping;

    const infoArtistMbids = cleanMbids(info?.artist_mbids);
    const artistMbids = infoArtistMbids.length
      ? infoArtistMbids
      : cleanMbids(mapping?.artist_mbids);

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
      releaseName: cleanText(meta?.release_name) || null,
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
  let declaredBytes = 0;
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (entry) => {
      if (!isListensEntry(entry.name)) return false;
      declaredBytes += entry.compression === 0 ? entry.size : entry.originalSize;
      if (declaredBytes > MAX_INFLATED_BYTES) {
        throw new Error("ListenBrainz export is too large to import");
      }
      return true;
    },
  });
  const out: ParsedListen[] = [];

  for (const data of Object.values(files)) {
    for (const listen of parseJsonl(strFromU8(data))) out.push(listen);
  }

  if (!out.length) {
    throw new Error(
      "ListenBrainz zip contained no listens/*.jsonl files",
    );
  }
  return out;
}
