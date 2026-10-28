import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import ReadSettingsRedirect from "./page";

describe("ReadSettingsRedirect", () => {
  it("redirects to the read sources tab and keeps the query", async () => {
    await ReadSettingsRedirect({ searchParams: Promise.resolve({ tab: "x", status: "ok" }) });
    expect(redirect).toHaveBeenCalledWith("/sources?tab=read&status=ok");
  });
});
