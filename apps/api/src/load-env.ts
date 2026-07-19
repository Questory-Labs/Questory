import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { pathToFileURL } from "node:url";

/**
 * Resolve relative SQLite file: URLs against apps/api/prisma so API + music
 * share one DB file regardless of process cwd.
 */
function normalizeSharedSqliteUrl() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) return;
  let pathPart = url.slice("file:".length);
  // file:/absolute or file:./relative
  if (pathPart.startsWith("//")) {
    pathPart = pathPart.slice(1);
  }
  if (isAbsolute(pathPart) || /^[A-Za-z]:[\\/]/.test(pathPart)) return;

  // nest outDir dist → __dirname = apps/api/dist → ../prisma = apps/api/prisma
  const sharedPrismaDir = resolve(__dirname, "../prisma");
  const abs = resolve(sharedPrismaDir, pathPart);
  process.env.DATABASE_URL = pathToFileURL(abs).href;
}

/**
 * Load env before Nest constructs providers.
 * Prefer repo-root .env, then apps/api/.env (without blanking filled values).
 */
export function loadEnvFiles() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(__dirname, "../../../.env"), // dist/ -> repo root
    resolve(__dirname, "../../.env"), // dist/ -> apps/api/.env
    resolve(__dirname, "../.env"),
  ];

  const seen = new Set<string>();
  for (const filePath of candidates) {
    const normalized = resolve(filePath);
    if (seen.has(normalized) || !existsSync(normalized)) continue;
    seen.add(normalized);
    loadDotenv({ path: normalized, override: false });
  }

  normalizeSharedSqliteUrl();
}
