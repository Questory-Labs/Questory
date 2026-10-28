import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import AdminMigrationsRedirect from "./page";

describe("AdminMigrationsRedirect", () => {
  it("redirects to the migrations tab of /admin/system, keeping other params", async () => {
    await AdminMigrationsRedirect({
      searchParams: Promise.resolve({ q: "1", tab: "old" }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/system?q=1&tab=migrations");
  });
});
