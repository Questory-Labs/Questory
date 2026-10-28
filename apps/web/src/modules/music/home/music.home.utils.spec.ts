import { describe, expect, it } from "vitest";
import {
  buildDailyLine,
  buildDotHeatmap,
  clockHour,
  fillDays,
  formatDayTick,
} from "./music.home.utils";

describe("music home utils", () => {
  it("fills missing days with zero buckets", () => {
    const days = fillDays([
      { key: "2026-10-03", label: "c", count: 3 },
      { key: "2026-10-01", label: "a", count: 1 },
    ]);
    expect(days.map((d) => [d.key, d.count])).toEqual([
      ["2026-10-01", 1],
      ["2026-10-02", 0],
      ["2026-10-03", 3],
    ]);
    expect(fillDays([])).toEqual([]);
  });

  it("formats day ticks and clock hours", () => {
    expect(formatDayTick("2026-10-05")).toBe("Oct 5");
    expect(clockHour(7)).toBe("07:00");
  });

  it("builds a daily line with peaks, target and quiet days", () => {
    expect(buildDailyLine([{ key: "2026-10-01", label: "a", count: 1 }], 5)).toBeNull();
    const line = buildDailyLine(
      [
        { key: "2026-10-01", label: "a", count: 8 },
        { key: "2026-10-02", label: "b", count: 2 },
        { key: "2026-10-04", label: "d", count: 12 },
      ],
      5,
    );
    expect(line).not.toBeNull();
    expect(line!.points).toHaveLength(4);
    expect(line!.peaks.map((p) => p.count)).toEqual([12, 8, 2]);
    expect(line!.quietDays).toBe(2);
    expect(line!.quietPaths).toHaveLength(1);
    expect(line!.targetY).not.toBeNull();
    expect(line!.path.startsWith("M0 ")).toBe(true);
  });

  it("omits the target when none is set", () => {
    const line = buildDailyLine(
      [
        { key: "2026-10-01", label: "a", count: 1 },
        { key: "2026-10-02", label: "b", count: 2 },
      ],
      null,
    );
    expect(line!.targetY).toBeNull();
    expect(line!.quietDays).toBe(0);
  });

  it("builds a 7x24 dot heatmap with a peak", () => {
    const grid = buildDotHeatmap({
      dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      hourLabels: [],
      maxCount: 9,
      cells: [
        { day: 4, hour: 22, count: 9 },
        { day: 0, hour: 8, count: 1 },
      ],
    });
    expect(grid.rows).toHaveLength(7);
    expect(grid.rows[0].cells).toHaveLength(24);
    expect(grid.peakLabel).toBe("Fri 22:00");
    expect(grid.rows[4].cells[22].tip).toBe("Fri 22:00 · 9 plays");
    expect(grid.rows[0].cells[8].tip).toBe("Mon 08:00 · 1 play");
    expect(buildDotHeatmap(undefined)).toEqual({ rows: [], peakLabel: null });
  });
});
