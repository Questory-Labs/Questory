import { describe, expect, it } from "vitest";
import {
  migrationCardTone,
  migrationMeta,
  parseResult,
  statusLabel,
} from "./admin.migrations.utils";

const now = new Date("2026-01-01T03:00:00.000Z").getTime();

describe("admin migrations utils", () => {
  it("labels statuses", () => {
    expect(statusLabel("not_run")).toBe("Not run");
    expect(statusLabel("completed")).toBe("Done");
    expect(statusLabel("weird")).toBe("weird");
  });

  it("parses results safely", () => {
    expect(parseResult(null)).toBeNull();
    expect(parseResult("{bad")).toBeNull();
    expect(parseResult('{"a":1}')).toEqual({ a: 1 });
  });

  it("builds the meta line with failed or completed times", () => {
    const m = {
      runCount: 2,
      lastStartedAt: "2026-01-01T01:00:00.000Z",
      lastCompletedAt: "2026-01-01T02:00:00.000Z",
      lastFailedAt: null,
      status: "completed",
    };
    expect(migrationMeta(m, now)).toBe("Runs 2 · started 2 h ago · completed 1 h ago");
    expect(
      migrationMeta({ ...m, status: "failed", lastFailedAt: "2026-01-01T02:00:00.000Z" }, now),
    ).toBe("Runs 2 · started 2 h ago · failed 1 h ago");
    expect(
      migrationMeta({ ...m, lastStartedAt: null, lastCompletedAt: null }, now),
    ).toBe("Runs 2");
  });

  it("tints failed and running cards", () => {
    expect(migrationCardTone("failed")).toContain("240,79,79");
    expect(migrationCardTone("running")).toContain("230,194,122");
    expect(migrationCardTone("completed")).toBe("");
  });
});
