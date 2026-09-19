import { describe, expect, it } from "vitest";
import {
  JOBS,
  assertAcyclic,
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

describe("parseArgs", () => {
  it("defaults to running tests, builds, and e2e", () => {
    expect(parseArgs([])).toEqual({
      skipE2e: false,
      skipBuild: false,
      skipTest: false,
      failFast: false,
      dryRun: false,
      help: false,
      concurrency: null,
    });
  });

  it("parses skip flags, fail-fast, dry-run, and help", () => {
    const flags = parseArgs([
      "--skip-e2e",
      "--skip-build",
      "--skip-test",
      "--fail-fast",
      "--dry-run",
      "--help",
    ]);
    expect(flags.skipE2e).toBe(true);
    expect(flags.skipBuild).toBe(true);
    expect(flags.skipTest).toBe(true);
    expect(flags.failFast).toBe(true);
    expect(flags.dryRun).toBe(true);
    expect(flags.help).toBe(true);
  });

  it("parses --concurrency as a following argument or equals form", () => {
    expect(parseArgs(["--concurrency", "4"]).concurrency).toBe(4);
    expect(parseArgs(["--concurrency=6"]).concurrency).toBe(6);
  });

  it("rejects invalid concurrency and unknown flags", () => {
    expect(() => parseArgs(["--concurrency", "0"])).toThrow(/Invalid --concurrency/);
    expect(() => parseArgs(["--nope"])).toThrow(/Unknown flag/);
  });
});

describe("JOBS graph", () => {
  it("is well-formed and acyclic", () => {
    expect(() => assertJobGraph(JOBS)).not.toThrow();
    expect(() => assertAcyclic(JOBS)).not.toThrow();
  });

  it("keeps Next production build and Playwright off the same .next tree", () => {
    const webBuild = JOBS.find((job) => job.id === "web:build");
    const webE2e = JOBS.find((job) => job.id === "web:e2e");
    expect(webBuild?.mutex).toBe("web-next");
    expect(webE2e?.mutex).toBe("web-next");
  });
});

describe("selectJobs", () => {
  it("includes tests, builds, e2e, and their prep deps by default", () => {
    const ids = selectJobs(JOBS).map((job) => job.id);
    expect(ids).toEqual(expect.arrayContaining([
      "prisma",
      "shared:build",
      "scripts:test",
      "shared:test",
      "ui:test",
      "api:test",
      "web:test",
      "db:build",
      "ui:build",
      "api:build",
      "web:build",
      "web:e2e",
    ]));
  });

  it("drops e2e when --skip-e2e", () => {
    const ids = selectJobs(JOBS, { skipE2e: true }).map((job) => job.id);
    expect(ids).not.toContain("web:e2e");
    expect(ids).toContain("web:build");
    expect(ids).toContain("api:test");
  });

  it("keeps shared/prisma prep when skipping production builds", () => {
    const ids = selectJobs(JOBS, { skipBuild: true }).map((job) => job.id);
    expect(ids).toContain("prisma");
    expect(ids).toContain("shared:build");
    expect(ids).toContain("api:test");
    expect(ids).toContain("web:e2e");
    expect(ids).not.toContain("web:build");
    expect(ids).not.toContain("api:build");
    expect(ids).not.toContain("ui:build");
    expect(ids).not.toContain("db:build");
  });

  it("keeps prisma for api:build when skipping tests and e2e", () => {
    const ids = selectJobs(JOBS, { skipTest: true, skipE2e: true }).map(
      (job) => job.id,
    );
    expect(ids).toContain("api:build");
    expect(ids).toContain("web:build");
    expect(ids).toContain("prisma");
    expect(ids).toContain("shared:build");
    expect(ids).not.toContain("api:test");
    expect(ids).not.toContain("web:e2e");
  });

  it("throws when every group is skipped", () => {
    expect(() =>
      selectJobs(JOBS, { skipTest: true, skipBuild: true, skipE2e: true }),
    ).toThrow(/Nothing to run/);
  });
});

describe("runnableJobs", () => {
  const mini = [
    { id: "a", group: "prep", pnpmArgs: [], dependsOn: [] },
    { id: "b", group: "test", pnpmArgs: [], dependsOn: ["a"] },
    { id: "c", group: "build", pnpmArgs: [], dependsOn: ["a"], mutex: "lock" },
    { id: "d", group: "e2e", pnpmArgs: [], dependsOn: ["a"], mutex: "lock" },
  ];

  const emptyState = {
    completed: new Set(),
    failed: new Set(),
    skipped: new Set(),
    running: new Set(),
    lockedMutex: new Set(),
  };

  it("starts jobs with no unfinished deps", () => {
    const ready = runnableJobs(mini, emptyState).map((job) => job.id);
    expect(ready).toEqual(["a"]);
  });

  it("starts dependents after completion and honors mutex", () => {
    const ready = runnableJobs(mini, {
      ...emptyState,
      completed: new Set(["a"]),
      lockedMutex: new Set(["lock"]),
    }).map((job) => job.id);
    expect(ready).toEqual(["b"]);
  });

  it("sorts ready jobs by id", () => {
    const ready = runnableJobs(mini, {
      ...emptyState,
      completed: new Set(["a"]),
    }).map((job) => job.id);
    expect(ready).toEqual(["b", "c", "d"]);
  });
});

describe("skipBlockedJobs", () => {
  const chain = [
    { id: "a", group: "prep", pnpmArgs: [], dependsOn: [] },
    { id: "b", group: "test", pnpmArgs: [], dependsOn: ["a"] },
    { id: "c", group: "build", pnpmArgs: [], dependsOn: ["b"] },
  ];

  it("skips transitive dependents of a failed job", () => {
    const failed = new Set(["a"]);
    const skipped = new Set();
    expect(skipBlockedJobs(chain, failed, skipped).sort()).toEqual(["b", "c"]);
    expect([...skipped].sort()).toEqual(["b", "c"]);
  });
});

describe("remainingUnstarted", () => {
  const jobs = [
    { id: "a", group: "test", pnpmArgs: [], dependsOn: [] },
    { id: "b", group: "test", pnpmArgs: [], dependsOn: [] },
  ];

  it("lists jobs that have not started", () => {
    expect(
      remainingUnstarted(jobs, {
        completed: new Set(["a"]),
        failed: new Set(),
        skipped: new Set(),
        running: new Set(),
      }),
    ).toEqual(["b"]);
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(65_000)).toBe("1m 05s");
  });
});

describe("defaultConcurrency", () => {
  it("caps at 6 and never goes below 1", () => {
    expect(defaultConcurrency(24)).toBe(6);
    expect(defaultConcurrency(4)).toBe(4);
    expect(defaultConcurrency(0)).toBe(1);
  });
});

describe("vitestMaxWorkers", () => {
  it("splits CPUs across the parallel job slots", () => {
    expect(vitestMaxWorkers(24, 6)).toBe(4);
    expect(vitestMaxWorkers(4, 8)).toBe(1);
  });
});

describe("commandArgs", () => {
  it("passes maxWorkers only to Vitest jobs", () => {
    expect(
      commandArgs(
        { id: "api:test", group: "test", pnpmArgs: ["--filter", "api", "test"], dependsOn: [] },
        2,
      ),
    ).toEqual(["--filter", "api", "test", "--", "--maxWorkers", "2"]);
    expect(
      commandArgs(
        { id: "api:build", group: "build", pnpmArgs: ["--filter", "api", "run", "build"], dependsOn: [] },
        2,
      ),
    ).toEqual(["--filter", "api", "run", "build"]);
  });
});
