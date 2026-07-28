/**
 * Write public/runtime-env.js from process.env so Hub-pulled web images
 * can take NEXT_PUBLIC_* / ENTERPRISE at container start (not only build time).
 *
 * Usage: node ./scripts/write-runtime-env.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "public", "runtime-env.js");

const keys = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_ENTERPRISE_URL",
  "NEXT_PUBLIC_ENABLE_MUSIC",
  "NEXT_PUBLIC_ENABLE_WATCH",
  "NEXT_PUBLIC_ENABLE_READ",
  "ENTERPRISE",
];

/** @type {Record<string, string>} */
const env = {};
for (const key of keys) {
  const value = process.env[key];
  if (typeof value === "string" && value.length > 0) {
    env[key] = value;
  }
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `window.__QUESTORY_RUNTIME__=${JSON.stringify(env)};\n`,
  "utf8",
);
console.log(`Wrote ${outFile} (${Object.keys(env).length} keys)`);
