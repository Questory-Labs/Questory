import { describe, expect, it } from "vitest";
import {
  MediaTrendingShelfSchema,
  WeeklyDigestRequestSchema,
  WeeklyDigestViewSchema,
} from "./index";

describe("MediaTrendingShelfSchema", () => {
  it("accepts a ranked shelf with a window label", () => {
    const parsed = MediaTrendingShelfSchema.safeParse({
      items: [
        {
          id: "1",
          name: "Radiohead",
          imageUrl: null,
          rank: 1,
          listenCount: 9,
        },
      ],
      meta: {
        source: "listenbrainz",
        windowLabel: "ListenBrainz week 2026-08-31 – 2026-09-06",
        from: "2026-08-31",
        to: "2026-09-06",
      },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("WeeklyDigestViewSchema", () => {
  it("accepts a peek miss", () => {
    const parsed = WeeklyDigestViewSchema.safeParse({
      cached: false,
      generating: false,
      result: null,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("WeeklyDigestRequestSchema", () => {
  it("accepts an empty body and a client context", () => {
    expect(WeeklyDigestRequestSchema.safeParse({}).success).toBe(true);
    expect(
      WeeklyDigestRequestSchema.safeParse({
        context: {
          localHour: 20,
          localWeekday: 5,
          timeZone: "Asia/Kolkata",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects an hour outside 0–23", () => {
    expect(
      WeeklyDigestRequestSchema.safeParse({
        context: { localHour: 99 },
      }).success,
    ).toBe(false);
  });
});
