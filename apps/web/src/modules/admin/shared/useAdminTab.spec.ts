import { describe, expect, it } from "vitest";
import { pickAdminTab } from "./useAdminTab";

describe("pickAdminTab", () => {
  const tabs = ["a", "b"] as const;

  it("returns the requested tab when known", () => {
    expect(pickAdminTab("b", tabs)).toBe("b");
  });

  it("falls back to the first tab", () => {
    expect(pickAdminTab(null, tabs)).toBe("a");
    expect(pickAdminTab("zzz", tabs)).toBe("a");
  });
});
