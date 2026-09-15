import { describe, expect, it } from "vitest";
import { dashboardRangeLabel } from "./dashboard";

describe("dashboardRangeLabel", () => {
  it("labels known insight windows and falls back to last 7 days", () => {
    expect(dashboardRangeLabel("day")).toBe("Last 24 hours");
    expect(dashboardRangeLabel("week")).toBe("Last 7 days");
    expect(dashboardRangeLabel("all")).toBe("All time");
    expect(dashboardRangeLabel(undefined)).toBe("Last 7 days");
  });
});
