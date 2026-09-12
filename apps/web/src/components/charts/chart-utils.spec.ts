import { describe, expect, it } from "vitest";
import {
  buildCalendarGrid,
  buildLineLayout,
  chartAnchorPoint,
  donutSlicePath,
  pickXTickIndices,
  heatmapLevel,
  monotoneAreaPath,
  monotoneLinePath,
} from "./chart-utils";

describe("buildLineLayout", () => {
  it("returns an empty layout when data is empty", () => {
    const layout = buildLineLayout([], 720);

    expect(layout.points).toEqual([]);
    expect(layout.curvePts).toEqual([]);
    expect(layout.areaPath).toBe("");
    expect(layout.xTickIdx.size).toBe(0);
    expect(layout.yTicks).toEqual([0]);
    expect(layout.yMax).toBe(1);
  });

  it("builds points and an area path for non-empty data", () => {
    const layout = buildLineLayout(
      [
        { label: "2024-01-01", value: 10 },
        { label: "2024-01-02", value: 20 },
      ],
      720,
    );

    expect(layout.points).toHaveLength(2);
    expect(layout.areaPath.startsWith("M ")).toBe(true);
    expect(layout.areaPath.endsWith("Z")).toBe(true);
  });

  it("does not put consecutive labels on a 14-day bar chart", () => {
    const data = Array.from({ length: 14 }, (_, i) => ({
      label: `2026-09-${String(i + 1).padStart(2, "0")}`,
      value: 1,
    }));
    const ticks = [...buildLineLayout(data, 400, { type: "bar", size: "md" }).xTickIdx].sort(
      (a, b) => a - b,
    );
    expect(ticks[ticks.length - 1]).toBe(13);
    expect(ticks.includes(12) && ticks.includes(13)).toBe(false);
  });
});

describe("pickXTickIndices", () => {
  it("keeps the last day off its neighbor on a 14-day bar axis", () => {
    const ticks = pickXTickIndices(14);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(13);
    expect(ticks[ticks.length - 1] - ticks[ticks.length - 2]).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("labels every point when the series is short", () => {
    expect(pickXTickIndices(1)).toEqual([0]);
    expect(pickXTickIndices(2)).toEqual([0, 1]);
  });
});

describe("monotoneLinePath", () => {
  it("uses a cubic through three points without overshooting a peak", () => {
    const d = monotoneLinePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith("M 0 10")).toBe(true);
    expect(d).toContain(" C ");
    expect(d.endsWith("20 10")).toBe(true);
  });

  it("closes an area back to the baseline", () => {
    const area = monotoneAreaPath(
      [
        { x: 0, y: 4 },
        { x: 10, y: 2 },
      ],
      20,
    );
    expect(area).toContain("L 10 20 L 0 20 Z");
  });
});

describe("chartAnchorPoint", () => {
  it("returns the target center relative to the root", () => {
    const root = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 80 }),
    } as HTMLElement;
    const target = {
      getBoundingClientRect: () => ({
        left: 80,
        top: 40,
        width: 20,
        height: 14,
      }),
    } as HTMLElement;

    expect(chartAnchorPoint(target, root)).toEqual({ x: 80, y: 20 });
  });
});

describe("heatmapLevel", () => {
  it("returns 0 for empty values", () => {
    expect(heatmapLevel(0, 10)).toBe(0);
    expect(heatmapLevel(4, 0)).toBe(0);
  });

  it("scales into 1–4 buckets", () => {
    expect(heatmapLevel(1, 100)).toBe(1);
    expect(heatmapLevel(50, 100)).toBe(2);
    expect(heatmapLevel(100, 100)).toBe(4);
  });
});

describe("buildCalendarGrid", () => {
  it("fills missing dates and pads to a Mon-first week", () => {
    const weeks = buildCalendarGrid([
      { date: "2026-03-10", value: 5 },
      { date: "2026-03-12", value: 2 },
    ]);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].days[0].date).toBe("2026-03-09");
    expect(weeks[0].days.map((d) => d.value)).toEqual([0, 5, 0, 2, 0, 0, 0]);
    const gap = weeks[0].days.find((d) => d.date === "2026-03-11");
    expect(gap?.value).toBe(0);
  });

  it("caps a long span to 53 weeks", () => {
    const days: { date: string; value: number }[] = [];
    const start = new Date(Date.UTC(2024, 0, 1));
    for (let i = 0; i < 420; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      days.push({ date: d.toISOString().slice(0, 10), value: 1 });
    }

    expect(buildCalendarGrid(days)).toHaveLength(53);
  });
});

describe("donutSlicePath", () => {
  it("closes a wedge as one subpath", () => {
    const d = donutSlicePath(100, 100, 40, 70, 0, Math.PI / 2);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/M /g)).toHaveLength(1);
  });
});
