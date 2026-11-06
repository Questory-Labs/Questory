import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_READ_ONLY_CODE } from "@questorylabs/shared";
import {
  assertDemoWriteAllowed,
  isDemoBlockedHref,
  setDemoModeActive,
  subscribeDemoBlocked,
} from "./demo-mode";
import { getApiUrl } from "./runtime-env";

describe("demo-mode", () => {
  const url = (path: string) => `${getApiUrl()}${path}`;

  afterEach(() => setDemoModeActive(false));

  it("does nothing outside demo mode", () => {
    expect(() => assertDemoWriteAllowed("POST", url("/v1/users/me"))).not.toThrow();
    expect(isDemoBlockedHref(url("/auth/steam"))).toBe(false);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks %s and notifies", (method) => {
    setDemoModeActive(true);
    const listener = vi.fn();
    const unsubscribe = subscribeDemoBlocked(listener);
    try {
      assertDemoWriteAllowed(method, url("/v1/users/me"));
      expect.unreachable();
    } catch (err) {
      expect(err).toMatchObject({
        status: 403,
        data: { code: DEMO_READ_ONLY_CODE },
      });
    }
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("allows reads and allowlisted read-style POSTs", () => {
    setDemoModeActive(true);
    expect(() => assertDemoWriteAllowed("GET", url("/v1/library"))).not.toThrow();
    expect(() =>
      assertDemoWriteAllowed("POST", url("/v1/recommendations/curate")),
    ).not.toThrow();
    expect(() => assertDemoWriteAllowed("POST", url("/auth/logout"))).not.toThrow();
  });

  it("blocks lookalike paths and non-API hosts", () => {
    setDemoModeActive(true);
    expect(() =>
      assertDemoWriteAllowed("POST", url("/v1/recommendations/feedback")),
    ).toThrow();
    expect(() =>
      assertDemoWriteAllowed("POST", url("/v1/recommendations/curate/x")),
    ).toThrow();
  });

  it("flags API-origin links only", () => {
    setDemoModeActive(true);
    expect(isDemoBlockedHref(url("/auth/steam"))).toBe(true);
    expect(isDemoBlockedHref("https://store.steampowered.com/app/1")).toBe(false);
  });
});
