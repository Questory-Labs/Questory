import { describe, expect, it } from "vitest";
import { buildLineLayout } from "./chart-utils";

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
