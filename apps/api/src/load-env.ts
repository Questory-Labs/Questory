import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

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
}
