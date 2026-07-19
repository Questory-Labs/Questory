import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dbDir = join(root, "packages", "db");
const apiClient = join(root, "apps", "api", "src", "generated", "prisma", "client.ts");

for (const app of ["api", "music", "watch"]) {
  mkdirSync(join(root, "apps", app, "src", "generated", "prisma"), {
    recursive: true,
  });
}

const result = spawnSync("pnpm", ["exec", "prisma", "generate"], {
  cwd: dbDir,
  encoding: "utf8",
  shell: true,
  env: process.env,
});

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.stdout || ""}${result.stderr || ""}`;
const hasClient = existsSync(apiClient);

if (/EPERM/i.test(output) && hasClient) {
  console.warn(
    "[prisma] generate skipped — files are locked. Using existing client.",
  );
  process.exit(0);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
