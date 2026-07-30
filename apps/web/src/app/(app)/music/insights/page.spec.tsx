import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import MusicInsightsRedirect from "./page";

describe("MusicInsightsRedirect", () => {
  it("redirects to /music", () => {
    MusicInsightsRedirect();
    expect(redirect).toHaveBeenCalledWith("/music");
  });
});
