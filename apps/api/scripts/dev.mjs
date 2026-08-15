import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerJs = resolve(apiRoot, "dist/scrobbler-worker.js");

const children = [];

function run(command, args) {
  const child = spawn(command, args, {
    cwd: apiRoot,
    stdio: "inherit",
    shell: true,
  });
  children.push(child);
  return child;
}

run("pnpm", ["exec", "nest", "start", "--watch"]);

const wait = setInterval(() => {
  if (!existsSync(workerJs)) return;
  clearInterval(wait);
  console.log("Starting scrobbler BullMQ worker (node --watch dist/scrobbler-worker.js)");
  run("node", ["--watch", workerJs]);
}, 400);

function shutdown() {
  clearInterval(wait);
  for (const child of children) child.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
