import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaybackClock } from "./usePlaybackClock";

describe("usePlaybackClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:00:30.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("ticks elapsed time while a track is playing", () => {
    const { result } = renderHook(() =>
      usePlaybackClock("2026-10-01T10:00:00.000Z", 120_000),
    );
    expect(result.current?.elapsedMs).toBe(30_000);
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current?.elapsedMs).toBe(32_000);
  });

  it("returns null without a start time or duration", () => {
    const { result: noStart } = renderHook(() => usePlaybackClock(null, 120_000));
    expect(noStart.current).toBeNull();
    const { result: noLength } = renderHook(() =>
      usePlaybackClock("2026-10-01T10:00:00.000Z", null),
    );
    expect(noLength.current).toBeNull();
  });
});
