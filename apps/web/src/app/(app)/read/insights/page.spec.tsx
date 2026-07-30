import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import ReadInsightsRedirect from "./page";

describe("ReadInsightsRedirect", () => {
  it("redirects to /read", () => {
    ReadInsightsRedirect();
    expect(redirect).toHaveBeenCalledWith("/read");
  });
});
