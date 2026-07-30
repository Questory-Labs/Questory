import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import WatchInsightsRedirect from "./page";

describe("WatchInsightsRedirect", () => {
  it("redirects to /watch", () => {
    WatchInsightsRedirect();
    expect(redirect).toHaveBeenCalledWith("/watch");
  });
});
