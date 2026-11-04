import { describe, expect, it } from "vitest";
import { adminTabHref } from "./admin.redirect";

describe("adminTabHref", () => {
  it("sets the tab", () => {
    expect(adminTabHref("/admin/jobs", "cron")).toBe("/admin/jobs?tab=cron");
  });

  it("preserves other params and overrides an existing tab", () => {
    expect(
      adminTabHref("/admin/jobs", "enrichment", {
        domain: "watch",
        tab: "old",
        status: ["failed", "pending"],
        empty: undefined,
      }),
    ).toBe("/admin/jobs?domain=watch&status=failed&status=pending&tab=enrichment");
  });
});
