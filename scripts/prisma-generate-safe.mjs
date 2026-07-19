import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dbDir = join(root, "packages", "db");
const lockPath = join(dbDir, ".prisma-generate.lock");

const GENERATORS = {
  client: {
    app: "api",
    client: join(root, "apps", "api", "src", "generated", "prisma", "client.ts"),
    outDir: join(root, "apps", "api", "src", "generated", "prisma"),
  },
  musicClient: {
    app: "music",
    client: join(
      root,
      "apps",
      "music",
      "src",
      "generated",
      "prisma",
      "client.ts",
    ),
    outDir: join(root, "apps", "music", "src", "generated", "prisma"),
  },
  watchClient: {
    app: "watch",
    client: join(
      root,
      "apps",
      "watch",
      "src",
      "generated",
      "prisma",
      "client.ts",
    ),
    outDir: join(root, "apps", "watch", "src", "generated", "prisma"),
  },
};

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

function sleepSync(ms) {
  const buf = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buf, 0, 0, ms);
}

function acquireLock({ timeoutMs = 120_000, staleMs = 180_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      writeFileSync(lockPath, `${process.pid}\n${Date.now()}\n`, {
        flag: "wx",
      });
      return;
    } catch (err) {
      if (err?.code !== "EEXIST") throw err;
      try {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs > staleMs) {
          unlinkSync(lockPath);
          continue;
        }
      } catch {
        // lock gone between exists and stat
      }
      sleepSync(250);
    }
  }
  throw new Error(
    `[prisma] timed out waiting for generate lock (${lockPath})`,
  );
}

function releaseLock() {
  try {
    unlinkSync(lockPath);
  } catch {
    // ignore
  }
}

function resolveGenerators(argv) {
  const names = argv.filter((a) => Object.hasOwn(GENERATORS, a));
  if (names.length === 0) return Object.keys(GENERATORS);
  return names;
}

function ensureOutDirs(names) {
  for (const name of names) {
    mkdirSync(GENERATORS[name].outDir, { recursive: true });
  }
}

function cleanOutDirs(names) {
  for (const name of names) {
    const { outDir } = GENERATORS[name];
    try {
      rmSync(outDir, { recursive: true, force: true });
    } catch {
      // locked files on Windows — generate / soft-skip will handle
    }
    mkdirSync(outDir, { recursive: true });
  }
}

function clientsReady(names) {
  return names.every((name) => existsSync(GENERATORS[name].client));
}

const TRANSIENT_FS =
  /EPERM|ENOENT|EEXIST|ENOTEMPTY|EBUSY|EAGAIN|resource busy|directory not empty/i;

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, "apps", "api", ".env"));

const generatorNames = resolveGenerators(process.argv.slice(2));
ensureOutDirs(generatorNames);

let exitCode = 1;
let lastOutput = "";

try {
  acquireLock();

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) cleanOutDirs(generatorNames);

    const args = ["exec", "prisma", "generate"];
    for (const name of generatorNames) {
      args.push("--generator", name);
    }

    const result = spawnSync("pnpm", args, {
      cwd: dbDir,
      encoding: "utf8",
      shell: true,
      env: process.env,
    });

    lastOutput = `${result.stdout || ""}${result.stderr || ""}`;
    exitCode = result.status ?? 1;

    if (exitCode === 0) break;

    if (!TRANSIENT_FS.test(lastOutput) || attempt === 3) break;

    console.warn(
      `[prisma] generate hit a transient FS error; retrying (${attempt}/3)…`,
    );
    sleepSync(400 * attempt);
  }
} finally {
  releaseLock();
}

if (exitCode === 0) {
  process.exit(0);
}

if (TRANSIENT_FS.test(lastOutput) && clientsReady(generatorNames)) {
  console.warn(
    "[prisma] generate skipped — output busy or raced. Using existing client.",
  );
  process.exit(0);
}

if (lastOutput) process.stderr.write(lastOutput);
process.exit(exitCode);
