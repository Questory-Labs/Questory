#!/usr/bin/env node
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  JOBS,
  USAGE,
  assertJobGraph,
  commandArgs,
  defaultConcurrency,
  formatDuration,
  parseArgs,
  remainingUnstarted,
  runnableJobs,
  selectJobs,
  skipBlockedJobs,
  vitestMaxWorkers,
} from "./check-local.lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const color = Boolean(process.stdout.isTTY);
const c = {
  dim: (s) => (color ? `\x1b[2m${s}\x1b[0m` : s),
  green: (s) => (color ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s) => (color ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (color ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s) => (color ? `\x1b[36m${s}\x1b[0m` : s),
  bold: (s) => (color ? `\x1b[1m${s}\x1b[0m` : s),
};

function prefixWriter(id, width) {
  const tag = `[${id}]`.padEnd(width + 2);
  return (line) => {
    process.stdout.write(`${c.dim(tag)} ${line}\n`);
  };
}

function attachPrefixedStream(stream, write) {
  let buf = "";
  stream.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) write(line);
  });
  return () => {
    if (buf.length) write(buf);
    buf = "";
  };
}

/**
 * @param {import("./check-local.lib.mjs").Job} job
 * @param {{ write: (line: string) => void }} io
 * @param {Set<import("node:child_process").ChildProcess>} children
 * @param {number} vitestWorkers
 */
function runJob(job, io, children, vitestWorkers) {
  return new Promise((resolve) => {
    const child = spawn(
      isWin ? "pnpm.cmd" : "pnpm",
      commandArgs(job, vitestWorkers),
      {
        cwd: root,
        env: { ...process.env, ...job.env },
        shell: isWin,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    children.add(child);

    const flushOut = attachPrefixedStream(child.stdout, io.write);
    const flushErr = attachPrefixedStream(child.stderr, io.write);

    child.on("error", (err) => {
      children.delete(child);
      io.write(err.message);
      resolve({ code: 1 });
    });
    child.on("close", (code) => {
      children.delete(child);
      flushOut();
      flushErr();
      resolve({ code: code ?? 1 });
    });
  });
}

function printPlan(jobs, concurrency, vitestWorkers) {
  const width = Math.max(...jobs.map((job) => job.id.length));
  console.log(
    `${c.bold("Questory local check")}  concurrency=${concurrency}  vitestWorkers=${vitestWorkers}  jobs=${jobs.length}`,
  );
  console.log("");
  for (const job of jobs) {
    const deps =
      job.dependsOn.length > 0 ? ` after ${job.dependsOn.join(", ")}` : " ready";
    const mutex = job.mutex ? `  mutex:${job.mutex}` : "";
    console.log(
      `  ${job.id.padEnd(width)}  ${c.dim(job.group)}${c.dim(deps)}${c.dim(mutex)}`,
    );
  }
}

function printSummary(results, elapsedMs) {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const width = Math.max(...results.map((r) => r.id.length));

  console.log("");
  console.log(c.dim("─".repeat(48)));
  const headline =
    failed > 0
      ? c.red(`${failed} failed`)
      : c.green(`${passed} passed`);
  console.log(
    `${c.bold("Local check")}  ${headline}  ${c.dim(`${passed} ok / ${failed} fail / ${skipped} skip`)}  ${c.cyan(formatDuration(elapsedMs))}`,
  );
  console.log("");
  for (const row of results) {
    const label =
      row.status === "pass"
        ? c.green("pass")
        : row.status === "fail"
          ? c.red("fail")
          : c.yellow("skip");
    const duration =
      row.ms != null ? c.dim(formatDuration(row.ms).padStart(8)) : c.dim("        ");
    const reason = row.reason ? `  ${c.dim(row.reason)}` : "";
    console.log(`  ${row.id.padEnd(width)}  ${duration}  ${label}${reason}`);
  }
}

async function main(argv = process.argv.slice(2)) {
  assertJobGraph(JOBS);
  const flags = parseArgs(argv);
  if (flags.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const jobs = selectJobs(JOBS, flags);
  const cpuCount = os.availableParallelism?.() ?? os.cpus().length ?? 4;
  const concurrency = flags.concurrency ?? defaultConcurrency(cpuCount);
  const vitestWorkers = vitestMaxWorkers(cpuCount, concurrency);

  if (flags.dryRun) {
    printPlan(jobs, concurrency, vitestWorkers);
    return 0;
  }

  printPlan(jobs, concurrency, vitestWorkers);
  console.log("");

  const startedAt = Date.now();
  const children = new Set();
  const completed = new Set();
  const failed = new Set();
  const skipped = new Set();
  const running = new Set();
  const lockedMutex = new Set();
  /** @type {Map<string, { status: "pass" | "fail" | "skip", ms?: number, reason?: string }>} */
  const outcome = new Map();
  let failFastTripped = false;

  const abortChildren = () => {
    for (const child of children) {
      try {
        child.kill("SIGTERM");
      } catch {
        // already exited
      }
    }
  };
  const onSignal = () => {
    abortChildren();
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const width = Math.max(...jobs.map((job) => job.id.length));

  const markSkipped = (ids, reason) => {
    for (const id of ids) {
      skipped.add(id);
      outcome.set(id, { status: "skip", reason });
      prefixWriter(id, width)(`skipped (${reason})`);
    }
  };

  await new Promise((resolve) => {
    const tick = () => {
      if (
        completed.size + failed.size + skipped.size === jobs.length &&
        running.size === 0
      ) {
        resolve();
        return;
      }

      if (failFastTripped) {
        const leftover = remainingUnstarted(jobs, {
          completed,
          failed,
          skipped,
          running,
        });
        if (leftover.length) markSkipped(leftover, "fail-fast");
        if (running.size === 0) {
          resolve();
          return;
        }
      }

      const slots = concurrency - running.size;
      if (slots <= 0 || failFastTripped) return;

      const ready = runnableJobs(jobs, {
        completed,
        failed,
        skipped,
        running,
        lockedMutex,
      }).slice(0, slots);

      for (const job of ready) {
        running.add(job.id);
        if (job.mutex) lockedMutex.add(job.mutex);
        const write = prefixWriter(job.id, width);
        write("start");
        const jobStarted = Date.now();

        runJob(job, { write }, children, vitestWorkers).then(({ code }) => {
          const ms = Date.now() - jobStarted;
          running.delete(job.id);
          if (job.mutex) lockedMutex.delete(job.mutex);

          if (code === 0) {
            completed.add(job.id);
            outcome.set(job.id, { status: "pass", ms });
            write(`pass ${formatDuration(ms)}`);
          } else {
            failed.add(job.id);
            outcome.set(job.id, { status: "fail", ms });
            write(`fail ${formatDuration(ms)} (exit ${code})`);
            const blocked = skipBlockedJobs(jobs, failed, skipped);
            if (blocked.length) {
              markSkipped(blocked, `blocked by ${job.id}`);
            }
            if (flags.failFast) failFastTripped = true;
          }

          tick();
        });
      }
    };

    tick();
  });

  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);

  const results = jobs.map((job) => ({
    id: job.id,
    ...(outcome.get(job.id) ?? { status: "skip", reason: "not run" }),
  }));
  printSummary(results, Date.now() - startedAt);
  return failed.size > 0 ? 1 : 0;
}

const isDirectRun = process.argv[1]
  ? path.normalize(fileURLToPath(import.meta.url)) ===
    path.normalize(path.resolve(process.argv[1]))
  : false;

if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    },
  );
}

export { main };
