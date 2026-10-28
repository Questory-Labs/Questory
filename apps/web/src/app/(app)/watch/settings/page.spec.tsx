import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import WatchSettingsRedirect from "./page";

describe("WatchSettingsRedirect", () => {
  it("redirects to the watch sources tab and keeps the query", async () => {
    await WatchSettingsRedirect({ searchParams: Promise.resolve({ tab: "x", status: "ok" }) });
    expect(redirect).toHaveBeenCalledWith("/sources?tab=watch&status=ok");
  });
});
