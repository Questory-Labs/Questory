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

  it("includes year when not the current year", () => {
    const now = new Date(2026, 6, 29, 12, 0, 0);
    const formatted = formatDateTime("2024-01-15T15:30:00.000Z", now);
    expect(formatted).toMatch(/2024/);
  });

  it("omits year for the current year", () => {
    const now = new Date(2026, 6, 29, 12, 0, 0);
    const formatted = formatDateTime("2026-03-10T15:30:00.000Z", now);
    expect(formatted).not.toMatch(/2026/);
  });
});
