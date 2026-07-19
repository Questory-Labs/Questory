import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dbDir = join(root, "packages", "db");
const apiClient = join(root, "apps", "api", "src", "generated", "prisma", "client.ts");

/** Match sync-prisma-schema.mjs — generate runs in a fresh process. */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, "apps", "api", ".env"));

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
