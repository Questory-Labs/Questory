import { describe, expect, it } from "vitest";
import {
  buildCalendarGrid,
  buildLineLayout,
  chartAnchorPoint,
  heatmapLevel,
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
