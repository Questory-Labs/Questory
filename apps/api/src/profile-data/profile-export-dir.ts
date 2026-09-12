import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";

/** Repo-root `data/profile-exports` (works when cwd is root or `apps/api`). */
export function resolveProfileExportDir() {
  const fromEnv = (process.env.PROFILE_EXPORT_DIR || "").trim();
  if (fromEnv) return fromEnv;

  const cwd = process.cwd();
  if (existsSync(join(cwd, "pnpm-workspace.yaml"))) {
    return join(cwd, "data", "profile-exports");
  }
  const fromApp = join(cwd, "..", "..", "data", "profile-exports");
  if (existsSync(join(cwd, "..", "..", "pnpm-workspace.yaml"))) {
    return fromApp;
  }
  return join(cwd, "data", "profile-exports");
}

export async function ensureProfileExportDir() {
  const dir = resolveProfileExportDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function profileExportZipPath(storageKey: string) {
  return join(resolveProfileExportDir(), storageKey);
}
