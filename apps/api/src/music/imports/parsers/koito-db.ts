import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { cleanMbid, cleanText, parseListenedAt, type ParsedListen } from "./types";

type KoitoRow = {
  listened_at: number;
  client: string | null;
  duration: number | null;
  recording_mbid: string | null;
  track_name: string | null;
  artist_name: string | null;
  artist_mbid: string | null;
  release_name: string | null;
  release_mbid: string | null;
};

const LISTEN_SQL = `
SELECT
  l.listened_at AS listened_at,
  l.client AS client,
  t.duration AS duration,
  t.musicbrainz_id AS recording_mbid,
  COALESCE(
    (SELECT alias FROM track_aliases WHERE track_id = t.id AND is_primary = 1 LIMIT 1),
    (SELECT alias FROM track_aliases WHERE track_id = t.id LIMIT 1)
  ) AS track_name,
  COALESCE(
    (
      SELECT aa.alias
      FROM artist_tracks at
      JOIN artist_aliases aa ON aa.artist_id = at.artist_id
      WHERE at.track_id = t.id
      ORDER BY at.is_primary DESC, aa.is_primary DESC
      LIMIT 1
    ),
    (
      SELECT aa.alias
      FROM artist_tracks at
      JOIN artist_aliases aa ON aa.artist_id = at.artist_id
      WHERE at.track_id = t.id
      LIMIT 1
    )
  ) AS artist_name,
  (
    SELECT a.musicbrainz_id
    FROM artist_tracks at
    JOIN artists a ON a.id = at.artist_id
    WHERE at.track_id = t.id
    ORDER BY at.is_primary DESC
    LIMIT 1
  ) AS artist_mbid,
  COALESCE(
    (SELECT alias FROM release_aliases WHERE release_id = t.release_id AND is_primary = 1 LIMIT 1),
    (SELECT alias FROM release_aliases WHERE release_id = t.release_id LIMIT 1)
  ) AS release_name,
  (SELECT musicbrainz_id FROM releases WHERE id = t.release_id) AS release_mbid
FROM listens l
JOIN tracks t ON t.id = l.track_id
ORDER BY l.listened_at ASC
`;

function assertKoitoSchema(db: InstanceType<typeof Database>) {
  const tables = new Set(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all()
      .map((r) => String((r as { name: string }).name)),
  );
  for (const required of [
    "listens",
    "tracks",
    "track_aliases",
    "artists",
    "artist_aliases",
    "releases",
    "release_aliases",
    "artist_tracks",
  ]) {
    if (!tables.has(required)) {
      throw new Error(`Not a Koito database (missing table: ${required})`);
    }
  }
}

function parseKoitoDbPath(path: string): ParsedListen[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    assertKoitoSchema(db);
    const rows = db.prepare(LISTEN_SQL).all() as KoitoRow[];
    const out: ParsedListen[] = [];
    for (const row of rows) {
      const trackName = cleanText(row.track_name);
      const artistName = cleanText(row.artist_name);
      if (!trackName || !artistName) continue;
      const listenedAt =
        typeof row.listened_at === "number"
          ? parseListenedAt(row.listened_at)
          : null;
      if (!listenedAt) continue;

      const artistMbid = cleanMbid(row.artist_mbid);
      const durationSec =
        typeof row.duration === "number" && row.duration > 0
          ? row.duration
          : 0;

      out.push({
        artistName,
        trackName,
        releaseName: cleanText(row.release_name) || null,
        listenedAt,
        recordingMbid: cleanMbid(row.recording_mbid),
        releaseMbid: cleanMbid(row.release_mbid),
        artistMbids: artistMbid ? [artistMbid] : undefined,
        durationMs: durationSec > 0 ? durationSec * 1000 : null,
        musicService: cleanText(row.client) || "koito",
        submissionClient: "koito_import",
      });
    }
    return out;
  } finally {
    db.close();
  }
}

/** Koito SQLite database dump already on disk (e.g. staged under `temp/`). */
export function parseKoitoDbFile(path: string): ParsedListen[] {
  return parseKoitoDbPath(path);
}

/** Koito SQLite database dump from an in-memory buffer. */
export async function parseKoitoDb(buffer: Buffer): Promise<ParsedListen[]> {
  const dir = await mkdtemp(join(tmpdir(), "ql-koito-"));
  const path = join(dir, "koito.db");
  try {
    await writeFile(path, buffer);
    return parseKoitoDbPath(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
