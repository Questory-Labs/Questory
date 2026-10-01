import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cargoArgs,
  cargoTomlPath,
  enterpriseDir,
  preflight,
} from "./dev-enterprise.lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cwd = enterpriseDir(repoRoot);
const extra = process.argv.slice(2);

const cargoCheck = spawnSync("cargo", ["--version"], {
  encoding: "utf8",
  shell: true,
});
const check = preflight({
  cargoTomlExists: existsSync(cargoTomlPath(cwd)),
  cargoAvailable: cargoCheck.status === 0,
});
if (!check.ok) {
  console.error(check.message);
  process.exit(1);
}

const child = spawn("cargo", cargoArgs(extra), {
  cwd,
  stdio: "inherit",
  shell: true,
});

function shutdown() {
  if (!child.killed) child.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
