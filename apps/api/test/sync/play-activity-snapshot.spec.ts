import { describe, expect, it } from "vitest";
import { truncateToUtcHour } from "../../src/sync/play-activity";

describe("truncateToUtcHour", () => {
  it("buckets to the UTC hour for snapshot dedupe", () => {
    const d = new Date("2026-07-25T15:47:33.123Z");
    const bucket = truncateToUtcHour(d);
    expect(bucket.toISOString()).toBe("2026-07-25T15:00:00.000Z");
  });

  it("is stable within the same hour", () => {
    const a = truncateToUtcHour(new Date("2026-07-25T15:01:00.000Z"));
    const b = truncateToUtcHour(new Date("2026-07-25T15:59:59.999Z"));
    expect(a.getTime()).toBe(b.getTime());
  });
});
