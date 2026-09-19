/**
 * Job graph and planner for the local parallel check runner.
 * CLI entry: scripts/check-local.mjs
 */
import os from "node:os";

export const SQLITE_ENV = {
  DATABASE_PROVIDER: "sqlite",
  DATABASE_URL: "file:./test.db",
};

export const TEST_ENV = {
  APP_MODE: "local",
  SESSION_SECRET: "test-session-secret-32chars!!",
  ...SQLITE_ENV,
};

export const E2E_ENV = {
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000",
  NEXT_PUBLIC_ENABLE_MUSIC: "true",
  NEXT_PUBLIC_ENABLE_WATCH: "true",
  NEXT_PUBLIC_ENABLE_READ: "true",
};

/** @typedef {"prep" | "test" | "build" | "e2e"} JobGroup */

/**
 * @typedef {{
 *   id: string,
 *   group: JobGroup,
 *   pnpmArgs: string[],
 *   dependsOn: string[],
 *   mutex?: string,
 *   env?: Record<string, string>,
 * }} Job
 */

/** @type {Job[]} */
export const JOBS = [
  {
    id: "prisma",
    group: "prep",
    pnpmArgs: ["db:generate"],
    dependsOn: [],
    env: SQLITE_ENV,
  },
  {
    id: "shared:build",
    group: "prep",
    pnpmArgs: ["--filter", "@questorylabs/shared", "build"],
    dependsOn: [],
  },
  {
    id: "db:build",
    group: "build",
    pnpmArgs: ["--filter", "@questorylabs/db", "run", "build"],
    dependsOn: [],
  },
  {
    id: "ui:build",
    group: "build",
    pnpmArgs: ["--filter", "@questorylabs/ui", "run", "build"],
    dependsOn: [],
  },
  {
    id: "scripts:test",
    group: "test",
    pnpmArgs: ["run", "test:scripts"],
    dependsOn: [],
  },
  {
    id: "shared:test",
    group: "test",
    pnpmArgs: ["--filter", "@questorylabs/shared", "test"],
    dependsOn: [],
  },
  {
    id: "ui:test",
    group: "test",
    pnpmArgs: ["--filter", "@questorylabs/ui", "test"],
    dependsOn: [],
  },
  {
    id: "api:test",
    group: "test",
    pnpmArgs: ["--filter", "@questorylabs/api", "test"],
    dependsOn: ["prisma", "shared:build"],
    env: TEST_ENV,
  },
  {
    id: "web:test",
    group: "test",
    pnpmArgs: ["--filter", "@questorylabs/web", "test"],
    dependsOn: ["shared:build"],
    env: TEST_ENV,
  },
  {
    id: "api:build",
    group: "build",
    pnpmArgs: ["--filter", "@questorylabs/api", "run", "build"],
    dependsOn: ["prisma", "shared:build"],
    env: SQLITE_ENV,
  },
  {
    id: "web:build",
    group: "build",
    pnpmArgs: ["--filter", "@questorylabs/web", "run", "build"],
    dependsOn: ["shared:build"],
    mutex: "web-next",
  },
  {
    id: "web:e2e",
    group: "e2e",
    pnpmArgs: ["--filter", "@questorylabs/web", "test:e2e"],
    dependsOn: ["shared:build"],
    mutex: "web-next",
    env: E2E_ENV,
  },
];

export const USAGE = `Usage: pnpm check -- [options]
       node scripts/check-local.mjs [options]

Run Questory unit tests, package/app builds, and Playwright e2e in parallel.
Prep jobs (Prisma generate, shared build) start immediately; dependents wait.
web:build and web:e2e share a mutex so they do not clobber .next.

Options:
  --skip-e2e          Skip Playwright e2e
  --skip-build        Skip production builds (shared/Prisma still run when tests need them)
  --skip-test         Skip Vitest unit tests
  --fail-fast         Do not start new jobs after the first failure
  --concurrency <n>   Max parallel jobs (default: min(6, CPU count))
  --dry-run           Print the job plan and exit
  -h, --help          Show this help
`;

/**
 * @param {string} value
 * @returns {number}
 */
export function parseConcurrency(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid --concurrency: ${value}`);
  }
  return n;
}

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {{
   *   skipE2e: boolean,
   *   skipBuild: boolean,
   *   skipTest: boolean,
   *   failFast: boolean,
   *   dryRun: boolean,
   *   help: boolean,
   *   concurrency: number | null,
   * }} */
  const flags = {
    skipE2e: false,
    skipBuild: false,
    skipTest: false,
    failFast: false,
    dryRun: false,
    help: false,
    concurrency: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        flags.help = true;
        break;
      case "--skip-e2e":
        flags.skipE2e = true;
        break;
      case "--skip-build":
        flags.skipBuild = true;
        break;
      case "--skip-test":
        flags.skipTest = true;
        break;
      case "--fail-fast":
        flags.failFast = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--concurrency": {
        flags.concurrency = parseConcurrency(argv[i + 1]);
        i += 1;
        break;
      }
      default: {
        if (arg.startsWith("--concurrency=")) {
          flags.concurrency = parseConcurrency(
            arg.slice("--concurrency=".length),
          );
          break;
        }
        throw new Error(`Unknown flag: ${arg}\n${USAGE}`);
      }
    }
  }

  return flags;
}

/**
 * @param {Job[]} jobs
 */
export function assertJobGraph(jobs) {
  const ids = new Set();
  for (const job of jobs) {
    if (ids.has(job.id)) {
      throw new Error(`Duplicate job id: ${job.id}`);
    }
    ids.add(job.id);
  }
  for (const job of jobs) {
    for (const dep of job.dependsOn) {
      if (!ids.has(dep)) {
        throw new Error(`Job ${job.id} depends on unknown job ${dep}`);
      }
    }
  }
  assertAcyclic(jobs);
}

/**
 * @param {Job[]} jobs
 */
export function assertAcyclic(jobs) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const visiting = new Set();
  const visited = new Set();

  const visit = (id) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Cycle in job graph at ${id}`);
    }
    visiting.add(id);
    const job = byId.get(id);
    if (!job) throw new Error(`Unknown job: ${id}`);
    for (const dep of job.dependsOn) visit(dep);
    visiting.delete(id);
    visited.add(id);
  };

  for (const job of jobs) visit(job.id);
}

/**
 * @param {Job[]} allJobs
 * @param {{ skipE2e?: boolean, skipBuild?: boolean, skipTest?: boolean }} flags
 * @returns {Job[]}
 */
export function selectJobs(allJobs, flags = {}) {
  const wanted = new Set();
  for (const job of allJobs) {
    if (job.group === "test" && !flags.skipTest) wanted.add(job.id);
    if (job.group === "build" && !flags.skipBuild) wanted.add(job.id);
    if (job.group === "e2e" && !flags.skipE2e) wanted.add(job.id);
  }
  if (wanted.size === 0) {
    throw new Error(
      "Nothing to run. Drop one of --skip-test, --skip-build, --skip-e2e.",
    );
  }

  const byId = new Map(allJobs.map((job) => [job.id, job]));
  const selected = new Set();
  const stack = [...wanted];
  while (stack.length) {
    const id = stack.pop();
    if (selected.has(id)) continue;
    const job = byId.get(id);
    if (!job) throw new Error(`Unknown job: ${id}`);
    selected.add(id);
    for (const dep of job.dependsOn) stack.push(dep);
  }

  return allJobs.filter((job) => selected.has(job.id));
}

/**
 * @param {Job[]} jobs
 * @param {{
 *   completed: Set<string>,
 *   failed: Set<string>,
 *   skipped: Set<string>,
 *   running: Set<string>,
 *   lockedMutex: Set<string>,
 * }} state
 * @returns {Job[]}
 */
export function runnableJobs(jobs, state) {
  return jobs
    .filter((job) => {
      if (
        state.completed.has(job.id) ||
        state.failed.has(job.id) ||
        state.skipped.has(job.id) ||
        state.running.has(job.id)
      ) {
        return false;
      }
      if (!job.dependsOn.every((dep) => state.completed.has(dep))) {
        return false;
      }
      if (job.mutex && state.lockedMutex.has(job.mutex)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Pick up to `slots` runnable jobs while reserving mutexes so two jobs that
 * share a mutex are never selected in the same batch.
 * @param {Job[]} jobs
 * @param {{
 *   completed: Set<string>,
 *   failed: Set<string>,
 *   skipped: Set<string>,
 *   running: Set<string>,
 *   lockedMutex: Set<string>,
 * }} state
 * @param {number} slots
 * @returns {Job[]}
 */
export function selectReadyJobs(jobs, state, slots) {
  const reservedMutex = new Set(state.lockedMutex);
  const ready = [];
  for (const job of runnableJobs(jobs, state)) {
    if (ready.length >= slots) break;
    if (job.mutex && reservedMutex.has(job.mutex)) continue;
    if (job.mutex) reservedMutex.add(job.mutex);
    ready.push(job);
  }
  return ready;
}

/**
 * Transitively skip jobs whose dependencies failed or were skipped.
 * @param {Job[]} jobs
 * @param {Set<string>} failed
 * @param {Set<string>} skipped
 * @returns {string[]} newly skipped ids
 */
export function skipBlockedJobs(jobs, failed, skipped) {
  const blocked = new Set([...failed, ...skipped]);
  const newly = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const job of jobs) {
      if (
        blocked.has(job.id) ||
        failed.has(job.id) ||
        skipped.has(job.id)
      ) {
        continue;
      }
      if (job.dependsOn.some((dep) => blocked.has(dep))) {
        skipped.add(job.id);
        blocked.add(job.id);
        newly.push(job.id);
        changed = true;
      }
    }
  }
  return newly;
}

/**
 * Remaining jobs that are not running and will never start (fail-fast).
 * @param {Job[]} jobs
 * @param {{ completed: Set<string>, failed: Set<string>, skipped: Set<string>, running: Set<string> }} state
 * @returns {string[]}
 */
export function remainingUnstarted(jobs, state) {
  return jobs
    .filter(
      (job) =>
        !state.completed.has(job.id) &&
        !state.failed.has(job.id) &&
        !state.skipped.has(job.id) &&
        !state.running.has(job.id),
    )
    .map((job) => job.id);
}

/**
 * Cap nested Vitest pools so parallel package tests do not oversubscribe the CPU.
 * @param {number} cpuCount
 * @param {number} concurrency
 */
export function vitestMaxWorkers(cpuCount, concurrency) {
  return Math.max(1, Math.floor(cpuCount / Math.max(1, concurrency)));
}

/**
 * @param {Job} job
 * @param {number} vitestWorkers
 */
export function commandArgs(job, vitestWorkers) {
  if (job.group !== "test") return job.pnpmArgs;
  return [...job.pnpmArgs, "--", "--maxWorkers", String(vitestWorkers)];
}

/**
 * @param {number} [cpuCount]
 */
export function defaultConcurrency(
  cpuCount = os.availableParallelism?.() ?? os.cpus().length ?? 4,
) {
  return Math.max(1, Math.min(6, cpuCount));
}

/**
 * @param {number} ms
 */
export function formatDuration(ms) {
  const totalSec = Math.max(0, ms) / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  let minutes = Math.floor(totalSec / 60);
  let seconds = Math.round(totalSec - minutes * 60);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
