import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import AdminCronRedirect from "./page";

describe("AdminCronRedirect", () => {
  it("redirects to the cron tab of /admin/jobs, keeping other params", async () => {
    await AdminCronRedirect({
      searchParams: Promise.resolve({ page: "2", tab: "old" }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/jobs?page=2&tab=cron");
  });
});
