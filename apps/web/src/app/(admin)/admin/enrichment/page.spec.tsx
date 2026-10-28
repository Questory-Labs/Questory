import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import AdminEnrichmentRedirect from "./page";

describe("AdminEnrichmentRedirect", () => {
  it("redirects to the enrichment tab of /admin/jobs, keeping other params", async () => {
    await AdminEnrichmentRedirect({
      searchParams: Promise.resolve({ page: "2", tab: "old" }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/jobs?page=2&tab=enrichment");
  });
});
