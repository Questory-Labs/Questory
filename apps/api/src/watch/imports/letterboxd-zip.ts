import { Unzip, UnzipInflate, strFromU8, unzipSync } from "fflate";

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
const INFLATE_CHUNK_BYTES = 16 * 1024;

class ZipLimitError extends Error {}

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

  const bytes = new Uint8Array(buffer);
  const best = selectZipEntries(bytes, want);
  if (!best.size) {
    throw new Error(
      "Zip contained none of diary.csv, ratings.csv, watched.csv, watchlist.csv",
    );
  }

  const texts = inflateZipEntries(bytes, best);

  const out: ExtractedLetterboxdCsv[] = [];
  for (const kind of LETTERBOXD_CSV_KINDS) {
    const hit = best.get(kind);
    const text = hit && texts.get(hit.rawName);
    if (!hit || text === undefined) continue;
    out.push({ kind, path: hit.path, text });
  }

  if (!out.length) {
    throw new Error(
      "Zip contained none of diary.csv, ratings.csv, watched.csv, watchlist.csv",
    );
  }
  return out;
}

type ZipSelection = { rawName: string; path: string; depth: number };

function selectZipEntries(
  bytes: Uint8Array,
  want: Set<LetterboxdCsvKind>,
): Map<LetterboxdCsvKind, ZipSelection> {
  const best = new Map<LetterboxdCsvKind, ZipSelection>();
  let entryCount = 0;
  let declaredBytes = 0;

  try {
    unzipSync(bytes, {
      filter(file) {
        entryCount += 1;
        if (entryCount > MAX_ENTRIES) {
          throw new ZipLimitError(
            `Zip has too many entries (max ${MAX_ENTRIES})`,
          );
        }

        const path = normalizeZipPath(file.name);
        if (!isSafeZipPath(path)) return false;
        if (shouldSkipPath(path)) return false;
        if (path.endsWith("/")) return false;
        if (file.originalSize > MAX_SINGLE_FILE_BYTES) return false;

        const basename = path.split("/").pop() || "";
        const kind = kindFromBasename(basename);
        if (!kind || !want.has(kind)) return false;

        declaredBytes += file.originalSize;
        if (declaredBytes > MAX_UNCOMPRESSED_BYTES) {
          throw new ZipLimitError("Zip uncompressed size exceeds limit");
        }

        const depth = path.split("/").length;
        const prev = best.get(kind);
        if (!prev || depth < prev.depth) {
          best.set(kind, { rawName: file.name, path, depth });
        }
        return false;
      },
    });
  } catch (err) {
    if (err instanceof ZipLimitError) throw err;
    throw new Error("Invalid or corrupted zip archive");
  }
  return best;
}

function inflateZipEntries(
  bytes: Uint8Array,
  selected: Map<LetterboxdCsvKind, ZipSelection>,
): Map<string, string> {
  const pending = new Set([...selected.values()].map((s) => s.rawName));
  const texts = new Map<string, string>();
  let failure: Error | null = null;
  let totalBytes = 0;

  const unzip = new Unzip((file) => {
    if (!pending.delete(file.name)) return;
    const basename = normalizeZipPath(file.name).split("/").pop() || "";
    const chunks: Uint8Array[] = [];
    let fileBytes = 0;

    file.ondata = (err, data, final) => {
      if (failure) return;
      if (err) {
        failure = new Error("Invalid or corrupted zip archive");
        return;
      }
      fileBytes += data.byteLength;
      totalBytes += data.byteLength;
      if (fileBytes > MAX_SINGLE_FILE_BYTES) {
        failure = new ZipLimitError(`${basename} exceeds size limit`);
      } else if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
        failure = new ZipLimitError("Zip uncompressed size exceeds limit");
      }
      if (failure) {
        chunks.length = 0;
        file.terminate();
        return;
      }
      chunks.push(data);
      if (final) texts.set(file.name, strFromU8(Buffer.concat(chunks)));
    };
    file.start();
  });
  unzip.register(UnzipInflate);

  try {
    for (
      let offset = 0;
      offset < bytes.length && !failure;
      offset += INFLATE_CHUNK_BYTES
    ) {
      const end = offset + INFLATE_CHUNK_BYTES;
      unzip.push(bytes.subarray(offset, end), end >= bytes.length);
    }
  } catch {
    failure ??= new Error("Invalid or corrupted zip archive");
  }
  if (failure) throw failure;
  if (pending.size || texts.size < selected.size) {
    throw new Error("Invalid or corrupted zip archive");
  }
  return texts;
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
