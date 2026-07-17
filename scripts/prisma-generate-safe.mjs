import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, "..", "apps", "api");
const generatedClient = join(apiDir, "src", "generated", "prisma", "client.ts");

const result = spawnSync("pnpm", ["exec", "prisma", "generate"], {
  cwd: apiDir,
  encoding: "utf8",
  shell: true,
  env: process.env,
});

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.stdout || ""}${result.stderr || ""}`;
const hasClient = existsSync(generatedClient);

if (/EPERM/i.test(output) && hasClient) {
  console.warn(
    "[prisma] generate skipped — files are locked (stop the API first to regenerate). Using existing client.",
  );
  process.exit(0);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
