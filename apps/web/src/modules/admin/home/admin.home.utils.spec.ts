import { describe, expect, it } from "vitest";
import {
  attentionHeadline,
  buildAttention,
  cronStatusLabel,
  healthLabel,
  uptimeLabel,
} from "./admin.home.utils";
import type { Overview } from "./admin.home.types";

const base: Overview = {
  users: { total: 1, admins: 1 },
  signup: { open: false, enabledSetting: false },
  syncJobs: { pending: 0, running: 0, failed: 0 },
  enrichment: { musicPending: 0, watchPending: 0, importsActive: 0 },
  music: { ok: true, status: "up" },
  watch: { ok: true, status: "up" },
  abuse: {},
  recentCronRuns: [],
};

describe("admin home utils", () => {
  it("formats uptime", () => {
    expect(uptimeLabel(undefined)).toBeNull();
    expect(uptimeLabel(120)).toBe("2 min");
    expect(uptimeLabel(7200)).toBe("2 h");
    expect(uptimeLabel(86400)).toBe("1 day");
    expect(uptimeLabel(6 * 86400)).toBe("6 days");
  });

  it("labels health", () => {
    expect(healthLabel({ ok: true, status: "up" })).toBe("Up");
    expect(healthLabel({ ok: false, status: "disabled" })).toBe("Off");
    expect(healthLabel({ ok: false, status: "unavailable" })).toBe("Down");
    expect(healthLabel({ ok: true })).toBe("Up");
  });

  it("labels cron status", () => {
    expect(cronStatusLabel("completed")).toBe("OK");
    expect(cronStatusLabel("failed")).toBe("Failed");
  });

  it("only flags the latest run per job", () => {
    const items = buildAttention({
      ...base,
      recentCronRuns: [
        { id: "a", jobName: "price-sync", status: "completed", startedAt: "2026-01-02T00:00:00Z" },
        { id: "b", jobName: "price-sync", status: "failed", startedAt: "2026-01-01T00:00:00Z" },
        { id: "c", jobName: "watch-sync", status: "failed", startedAt: "2026-01-01T00:00:00Z" },
      ],
    });
    expect(items.map((i) => i.key)).toEqual(["cron-c"]);
  });

  it("builds a headline", () => {
    expect(attentionHeadline(0)).toBe("all quiet");
    expect(attentionHeadline(1)).toBe("one thing needs you");
    expect(attentionHeadline(12)).toBe("12 things need you");
  });
});
