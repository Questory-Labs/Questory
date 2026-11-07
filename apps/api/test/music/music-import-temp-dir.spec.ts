import { existsSync, realpathSync } from "fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createImportStagingDir,
  resolveRepoTempDir,
} from "../../src/music/imports/temp-dir";

describe("import temp dir", () => {
  const originalCwd = process.cwd();
  let root: string;

  beforeEach(async () => {
    root = realpathSync(await mkdtemp(join(tmpdir(), "music-import-temp-")));
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  });

  it("uses temp under cwd at the workspace root", async () => {
    await writeFile(join(root, "pnpm-workspace.yaml"), "");
    process.chdir(root);
    expect(resolveRepoTempDir()).toBe(join(root, "temp"));
  });

  it("climbs to the workspace root from apps/api", async () => {
    await writeFile(join(root, "pnpm-workspace.yaml"), "");
    const app = join(root, "apps", "api");
    await mkdir(app, { recursive: true });
    process.chdir(app);
    expect(resolveRepoTempDir()).toBe(join(root, "temp"));
  });

  it("falls back to temp under cwd outside a workspace", async () => {
    const nested = join(root, "a", "b");
    await mkdir(nested, { recursive: true });
    process.chdir(nested);
    expect(resolveRepoTempDir()).toBe(join(nested, "temp"));
  });

  it("creates the per-job staging dir", async () => {
    process.chdir(root);
    const dir = await createImportStagingDir("job-1");
    expect(dir).toBe(join(root, "temp", "music-imports", "job-1"));
    expect((await stat(dir)).isDirectory()).toBe(true);
  });

  it("is idempotent and keeps existing staged files", async () => {
    process.chdir(root);
    const dir = await createImportStagingDir("job-1");
    await writeFile(join(dir, "kept.json"), "{}");
    await createImportStagingDir("job-1");
    expect(existsSync(join(dir, "kept.json"))).toBe(true);
  });

  it.each(["../..", "..", "a/b", "a\\b", "", ".", "a b", "job\u0000"])(
    "rejects unsafe job id %j without creating anything",
    async (jobId) => {
      process.chdir(root);
      await expect(createImportStagingDir(jobId)).rejects.toThrow(
        "Invalid import job id",
      );
      expect(existsSync(join(root, "temp"))).toBe(false);
    },
  );

  it("keeps jobs in separate directories", async () => {
    process.chdir(root);
    expect(await createImportStagingDir("a")).not.toBe(
      await createImportStagingDir("b"),
    );
  });
});
