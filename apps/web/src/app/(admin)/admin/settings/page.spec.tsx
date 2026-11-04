import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import AdminSettingsRedirect from "./page";

describe("AdminSettingsRedirect", () => {
  it("redirects to the settings tab of /admin/system, keeping other params", async () => {
    await AdminSettingsRedirect({
      searchParams: Promise.resolve({ q: "1", tab: "old" }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/system?q=1&tab=settings");
  });
});
