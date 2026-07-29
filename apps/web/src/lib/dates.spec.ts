import { describe, expect, it } from "vitest";
import { formatDateTime, localDayKey, withTz } from "./dates";

describe("withTz", () => {
  it("appends tz to paths without a query", () => {
    expect(withTz("/analytics/overview", "Asia/Kolkata")).toBe(
      "/analytics/overview?tz=Asia%2FKolkata",
    );
  });

  it("appends tz with & when query exists", () => {
    expect(withTz("/analytics/insights?range=week", "UTC")).toBe(
      "/analytics/insights?range=week&tz=UTC",
    );
  });
});

describe("localDayKey", () => {
  it("uses local calendar components", () => {
    const d = new Date(2026, 6, 29, 1, 15, 0);
    expect(localDayKey(d.toISOString())).toBe("2026-07-29");
  });
});

describe("formatDateTime", () => {
  it("returns em dash for empty", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});
