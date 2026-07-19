import { open } from "fs/promises";
import type { ImportSource } from "./types";

const SQLITE_MAGIC = Buffer.from("SQLite format 3\0");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]); // PK
const SNIFF_BYTES = 8192;

/** Peek at the start of a file — never load the whole upload into memory. */
export async function detectImportSourceFromPath(
  fileName: string,
  filePath: string,
): Promise<ImportSource> {
  const fh = await open(filePath, "r");
  try {
    const header = Buffer.alloc(SNIFF_BYTES);
    const { bytesRead } = await fh.read(header, 0, SNIFF_BYTES, 0);
    return detectImportSource(fileName, header.subarray(0, bytesRead));
  } finally {
    await fh.close();
  }
}

function sniffJsonSample(sample: string): ImportSource | null {
  if (
    sample.includes("master_metadata_track_name") ||
    sample.includes("ms_played")
  ) {
    return "spotify_json";
  }
  if (sample.includes('"scrobbles"') || sample.includes('"scrobbles":')) {
    return "maloja_json";
  }
  if (
    (sample.includes('"version"') || sample.includes('"version":')) &&
    sample.includes('"listens"')
  ) {
    return "koito_json";
  }
  if (
    sample.includes("recenttracks") ||
    (sample.includes('"track"') && sample.includes("#text"))
  ) {
    return "lastfm_json";
  }
  return null;
}

/** Detect import format from filename hints then content magic / sample. */
export function detectImportSource(
  fileName: string,
  buffer: Buffer,
): ImportSource {
  const lower = fileName.toLowerCase();

  if (lower.includes("streaming_history_audio")) return "spotify_json";
  if (lower.includes("maloja")) return "maloja_json";
  if (lower.includes("recenttracks")) return "lastfm_json";
  if (lower.includes("listenbrainz")) {
    if (lower.endsWith(".zip") || buffer.subarray(0, 2).equals(ZIP_MAGIC)) {
      return "listenbrainz_zip";
    }
  }
  if (
    lower.endsWith(".db") ||
    lower.endsWith(".sqlite") ||
    lower.endsWith(".sqlite3") ||
    (lower.includes("koito") && !lower.endsWith(".json"))
  ) {
    if (buffer.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
      return "koito_db";
    }
  }
  if (lower.includes("koito") && lower.endsWith(".json")) {
    return "koito_json";
  }

  if (buffer.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
    return "koito_db";
  }
  if (buffer.subarray(0, 2).equals(ZIP_MAGIC)) {
    return "listenbrainz_zip";
  }

  const start = buffer
    .subarray(0, Math.min(buffer.length, 64))
    .toString("utf8")
    .trimStart();
  if (start.startsWith("{") || start.startsWith("[")) {
    const sample = buffer
      .subarray(0, Math.min(buffer.length, SNIFF_BYTES))
      .toString("utf8");
    const sniffed = sniffJsonSample(sample);
    if (sniffed) return sniffed;
  }

  throw new Error(
    "Unrecognized import file. Supported: Koito .db / Koito JSON export, Spotify Streaming_History_Audio*.json, Maloja (*maloja*.json), Last.fm (*recenttracks*.json), ListenBrainz export .zip",
  );
}
