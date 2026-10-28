import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import AdminScrapersRedirect from "./page";

describe("AdminScrapersRedirect", () => {
  it("redirects to the scrapers tab of /admin/jobs, keeping other params", async () => {
    await AdminScrapersRedirect({
      searchParams: Promise.resolve({ page: "2", tab: "old" }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/jobs?page=2&tab=scrapers");
  });
});
