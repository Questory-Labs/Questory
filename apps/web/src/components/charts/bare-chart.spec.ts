import { describe, expect, it } from "vitest";
import { pickPeakPoints } from "./bare-chart";

describe("pickPeakPoints", () => {
  it("returns the highest non-zero points without mutating the input", () => {
    const points = [{ value: 0 }, { value: 2 }, { value: 9 }, { value: 4 }, { value: 1 }];
    expect(pickPeakPoints(points).map((p) => p.value)).toEqual([9, 4, 2]);
    expect(points[0].value).toBe(0);
  });
});
