import { unzipSync, strFromU8 } from "fflate";

export const LETTERBOXD_CSV_KINDS = [
  "diary",
  "ratings",
  "watched",
  "watchlist",
] as const;

export type LetterboxdCsvKind = (typeof LETTERBOXD_CSV_KINDS)[number];

const ALLOWED = new Set<string>(LETTERBOXD_CSV_KINDS.map((k) => `${k}.csv`));

/** Skip Letterboxd backup/orphan trees — prefer live export CSVs. */
const SKIP_PATH_PARTS = new Set(["deleted", "orphaned", "__macosx"]);

const MAX_ENTRIES = 256;
const MAX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 15 * 1024 * 1024;

export type ExtractedLetterboxdCsv = {
  kind: LetterboxdCsvKind;
  /** Zip entry path (normalized) or original upload name for bare CSV. */
  path: string;
  text: string;
};

function normalizeZipPath(name: string): string {
  return name.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isSafeZipPath(normalized: string): boolean {
  if (!normalized || normalized.includes("\0")) return false;
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false;
  const parts = normalized.split("/");
  if (parts.some((p) => p === ".." || p === ".")) return false;
  return true;
}

function shouldSkipPath(normalized: string): boolean {
  const parts = normalized.toLowerCase().split("/");
  return parts.some((p) => SKIP_PATH_PARTS.has(p));
}

function kindFromBasename(basename: string): LetterboxdCsvKind | null {
  const lower = basename.toLowerCase();
  if (!ALLOWED.has(lower)) return null;
  return lower.replace(/\.csv$/, "") as LetterboxdCsvKind;
}

/**
 * Pull allowlisted Letterboxd CSVs from an official export zip.
 * Only `diary.csv` / `ratings.csv` / `watched.csv` / `watchlist.csv` are read;
 * path traversal, absolute paths, and deleted/orphaned trees are rejected.
 */
export function extractLetterboxdCsvs(
  buffer: Buffer,
  include?: LetterboxdCsvKind[],
): ExtractedLetterboxdCsv[] {
  const want = new Set(
    include?.length ? include : [...LETTERBOXD_CSV_KINDS],
  );

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer), {
      filter(file) {
        return !file.originalSize || file.originalSize <= MAX_SINGLE_FILE_BYTES;
      },
    });
  } catch {
    throw new Error("Invalid or corrupted zip archive");
  }

  const entries = Object.entries(files);
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Zip has too many entries (max ${MAX_ENTRIES})`);
  }

  let totalBytes = 0;
  /** Prefer shallowest non-skipped path per kind. */
  const best = new Map<
    LetterboxdCsvKind,
    { path: string; data: Uint8Array; depth: number }
  >();

  for (const [rawName, data] of entries) {
    const path = normalizeZipPath(rawName);
    if (!isSafeZipPath(path)) continue;
    if (shouldSkipPath(path)) continue;
    if (path.endsWith("/")) continue;

    const basename = path.split("/").pop() || "";
    const kind = kindFromBasename(basename);
    if (!kind || !want.has(kind)) continue;

    totalBytes += data.byteLength;
    if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("Zip uncompressed size exceeds limit");
    }
    if (data.byteLength > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`${basename} exceeds size limit`);
    }

    const depth = path.split("/").length;
    const prev = best.get(kind);
    if (!prev || depth < prev.depth) {
      best.set(kind, { path, data, depth });
    }
  }

  const out: ExtractedLetterboxdCsv[] = [];
  for (const kind of LETTERBOXD_CSV_KINDS) {
    if (!want.has(kind)) continue;
    const hit = best.get(kind);
    if (!hit) continue;
    out.push({
      kind,
      path: hit.path,
      text: strFromU8(hit.data),
    });
  }

  if (!out.length) {
    throw new Error(
      "Zip contained none of diary.csv, ratings.csv, watched.csv, watchlist.csv",
    );
  }
  return out;
}

/** Infer CSV kind from a bare upload filename; default diary. */
export function inferLetterboxdKindFromFileName(
  fileName?: string,
): LetterboxdCsvKind {
  if (!fileName) return "diary";
  const base = fileName.replace(/\\/g, "/").split("/").pop() || "";
  return kindFromBasename(base) ?? "diary";
}

export function isZipBuffer(buffer: Buffer, fileName?: string): boolean {
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    // PK\x03\x04 local, PK\x01\x02 central, PK\x05\x06 empty
    const b2 = buffer[2];
    const b3 = buffer[3];
    if (
      (b2 === 0x03 && b3 === 0x04) ||
      (b2 === 0x01 && b3 === 0x02) ||
      (b2 === 0x05 && b3 === 0x06)
    ) {
      return true;
    }
  }
  return (fileName || "").toLowerCase().endsWith(".zip");
}

export function parseIncludeKinds(
  raw?: string | string[] | null,
): LetterboxdCsvKind[] | undefined {
  if (raw == null || raw === "") return undefined;
  const parts = (Array.isArray(raw) ? raw.join(",") : raw)
    .split(/[,+\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const kinds = parts.filter((p): p is LetterboxdCsvKind =>
    (LETTERBOXD_CSV_KINDS as readonly string[]).includes(p),
  );
  return kinds.length ? kinds : undefined;
}
