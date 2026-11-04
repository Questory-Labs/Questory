import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import MusicSettingsRedirect from "./page";

describe("MusicSettingsRedirect", () => {
  it("redirects to the music sources tab and keeps the query", async () => {
    await MusicSettingsRedirect({ searchParams: Promise.resolve({ tab: "x", status: "ok" }) });
    expect(redirect).toHaveBeenCalledWith("/sources?tab=music&status=ok");
  });
});
