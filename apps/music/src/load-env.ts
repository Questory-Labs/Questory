import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadDotenv } from "dotenv";

/**
 * Resolve relative SQLite file: URLs against apps/api/prisma (shared schema
 * location) so music and API hit the same file.
 */
function normalizeSharedSqliteUrl() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) return;
  let pathPart = url.slice("file:".length);
  if (pathPart.startsWith("//")) pathPart = pathPart.slice(1);
  if (isAbsolute(pathPart) || /^[A-Za-z]:[\\/]/.test(pathPart)) return;

  // __dirname = apps/music/dist → ../../api/prisma
  const sharedPrismaDir = resolve(__dirname, "../../api/prisma");
  const abs = resolve(sharedPrismaDir, pathPart);
  process.env.DATABASE_URL = pathToFileURL(abs).href;
}

/**
 * Load env before Nest constructs providers.
 * Uses the same DATABASE_URL as apps/api (shared DB).
 */
export function loadEnvFiles() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(__dirname, "../../../.env"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../.env"),
  ];

  const seen = new Set<string>();
  for (const filePath of candidates) {
    const normalized = resolve(filePath);
    if (seen.has(normalized) || !existsSync(normalized)) continue;
    seen.add(normalized);
    loadDotenv({ path: normalized, override: false });
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db";
  }

  normalizeSharedSqliteUrl();
}
