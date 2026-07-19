import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";

/** Repo-root `temp/` (works when cwd is root or `apps/music`). */
export function resolveRepoTempDir() {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "pnpm-workspace.yaml"))) {
    return join(cwd, "temp");
  }
  const fromApp = join(cwd, "..", "..", "temp");
  if (existsSync(join(cwd, "..", "..", "pnpm-workspace.yaml"))) {
    return fromApp;
  }
  return join(cwd, "temp");
}

/** Per-job staging dir under `temp/music-imports/<jobId>/`. */
export async function createImportStagingDir(jobId: string) {
  const dir = join(resolveRepoTempDir(), "music-imports", jobId);
  await mkdir(dir, { recursive: true });
  return dir;
}
