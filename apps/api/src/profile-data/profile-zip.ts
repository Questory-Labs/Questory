import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import {
  QUESTORY_PROFILE_JSON_NAME,
  QUESTORY_PROFILE_README_NAME,
} from "@questorylabs/shared";
import { PROFILE_IMPORT_MAX_BYTES } from "./profile-data.constants";

const MAX_ENTRIES = 16;

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

export function zipProfileArchive(json: string, readme: string): Buffer {
  const packed = zipSync(
    {
      [QUESTORY_PROFILE_JSON_NAME]: strToU8(json),
      [QUESTORY_PROFILE_README_NAME]: strToU8(readme),
    },
    { level: 6 },
  );
  return Buffer.from(packed);
}

export function unzipProfileArchiveJson(buffer: Buffer): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer), {
      filter(file) {
        return !file.originalSize || file.originalSize <= PROFILE_IMPORT_MAX_BYTES;
      },
    });
  } catch {
    throw new Error("Invalid or corrupted zip archive");
  }

  const entries = Object.entries(files);
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Zip has too many entries (max ${MAX_ENTRIES})`);
  }

  let total = 0;
  let jsonText: string | null = null;
  for (const [rawName, bytes] of entries) {
    const name = normalizeZipPath(rawName);
    if (!isSafeZipPath(name)) continue;
    total += bytes.byteLength;
    if (total > PROFILE_IMPORT_MAX_BYTES) {
      throw new Error("Zip contents are too large");
    }
    const base = name.split("/").pop() || name;
    if (base.toLowerCase() === QUESTORY_PROFILE_JSON_NAME) {
      jsonText = strFromU8(bytes);
    }
  }

  if (!jsonText) {
    throw new Error(`Zip must contain ${QUESTORY_PROFILE_JSON_NAME}`);
  }
  return jsonText;
}

export function profileExportReadme(exportedAt: string, services: string[]) {
  const list =
    services.length > 0
      ? services.map((s) => `- ${s}`).join("\n")
      : "- (none recorded)";
  return [
    "Questory profile export",
    `Generated: ${exportedAt}`,
    "",
    "This zip does not include passwords, API keys, or OAuth tokens.",
    "Reconnect services under Settings → Connections, then import this file",
    "on Settings → Profile.",
    "",
    "Services that were connected when this file was made:",
    list,
  ].join("\n");
}
