import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRotatingTagline } from "./useRotatingTagline";
import { taglinePool } from "@/lib/status-taglines";

describe("useRotatingTagline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("picks a tagline from the pool after mount", () => {
    const { result } = renderHook(() => useRotatingTagline("loading"));
    expect(result.current).not.toBeNull();
    expect(taglinePool("loading")).toContain(result.current);
  });

  it("rotates to a different tagline on each interval", () => {
    const { result } = renderHook(() =>
      useRotatingTagline("loading", { intervalMs: 1000 }),
    );

    for (let i = 0; i < 5; i++) {
      const before = result.current;
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current).not.toBe(before);
      expect(taglinePool("loading")).toContain(result.current);
    }
  });

  it("does not rotate when rotate is false", () => {
    const { result } = renderHook(() =>
      useRotatingTagline("serverError", { rotate: false }),
    );
    const first = result.current;
    expect(first).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(first);
  });
});
