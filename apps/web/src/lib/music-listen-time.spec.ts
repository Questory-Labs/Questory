import { describe, expect, it } from "vitest";
import {
  formatListenDayHeader,
  formatListenRowTime,
  groupListensByDay,
  listenDayKey,
} from "./music";

describe("listenDayKey", () => {
  it("uses local calendar components", () => {
    const d = new Date(2026, 6, 29, 1, 15, 0);
    expect(listenDayKey(d.toISOString())).toBe("2026-07-29");
  });
});

describe("formatListenDayHeader", () => {
  const now = new Date(2026, 6, 29, 14, 0, 0);

  it("labels today and yesterday", () => {
    expect(formatListenDayHeader(new Date(2026, 6, 29, 9, 0).toISOString(), now)).toBe(
      "Today",
    );
    expect(formatListenDayHeader(new Date(2026, 6, 28, 22, 0).toISOString(), now)).toBe(
      "Yesterday",
    );
  });

  it("formats older same-year days with weekday", () => {
    const label = formatListenDayHeader(
      new Date(2026, 6, 21, 12, 0).toISOString(),
      now,
    );
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/21/);
    expect(label).not.toMatch(/2026/);
  });

  it("includes year when different from now", () => {
    const label = formatListenDayHeader(
      new Date(2025, 11, 25, 12, 0).toISOString(),
      now,
    );
    expect(label).toMatch(/2025/);
  });
});

describe("formatListenRowTime", () => {
  const now = new Date(2026, 6, 29, 14, 0, 0);

  it("uses relative timing for today", () => {
    expect(
      formatListenRowTime(new Date(2026, 6, 29, 13, 58).toISOString(), now),
    ).toBe("2m ago");
    expect(
      formatListenRowTime(new Date(2026, 6, 29, 12, 0).toISOString(), now),
    ).toBe("2h ago");
    expect(
      formatListenRowTime(new Date(2026, 6, 29, 14, 0).toISOString(), now),
    ).toBe("just now");
  });

  it("uses clock time for older days", () => {
    const label = formatListenRowTime(
      new Date(2026, 6, 28, 21, 5).toISOString(),
      now,
    );
    expect(label).toMatch(/5/);
    expect(label).not.toMatch(/ago/);
  });
});

describe("groupListensByDay", () => {
  it("clubs listens under Today / Yesterday / dated headers", () => {
    const now = new Date(2026, 6, 29, 14, 0, 0);
    const groups = groupListensByDay(
      [
        { id: "a", listenedAt: new Date(2026, 6, 29, 13, 0).toISOString() },
        { id: "b", listenedAt: new Date(2026, 6, 29, 10, 0).toISOString() },
        { id: "c", listenedAt: new Date(2026, 6, 28, 20, 0).toISOString() },
        { id: "d", listenedAt: new Date(2026, 6, 21, 8, 0).toISOString() },
      ],
      now,
    );

    expect(groups.map((g) => g.label)).toEqual([
      "Today",
      "Yesterday",
      expect.stringMatching(/Jul/),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["c"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["d"]);
  });
});
