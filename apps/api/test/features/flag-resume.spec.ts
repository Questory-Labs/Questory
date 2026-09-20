import { afterEach, describe, expect, it, vi } from "vitest";
import { FlagResume } from "../../src/features/flag-resume";
import { FEATURE_FLAGS_TTL_MS } from "../../src/features/features.constants";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

describe("FlagResume", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes resume when flags change", () => {
    const resume = vi.fn();
    const listeners = new Set<() => void>();
    const flags = {
      onChange: (fn: () => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    } as unknown as FeatureFlagsService;
    const gate = new FlagResume(flags, resume);
    for (const fn of listeners) fn();
    expect(resume).toHaveBeenCalledTimes(1);
    gate.dispose();
    for (const fn of listeners) fn();
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("invokes resume after the flag TTL when scheduled", async () => {
    vi.useFakeTimers();
    const resume = vi.fn();
    const flags = {
      onChange: () => () => undefined,
    } as unknown as FeatureFlagsService;
    const gate = new FlagResume(flags, resume);
    gate.schedule();
    expect(resume).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(FEATURE_FLAGS_TTL_MS);
    expect(resume).toHaveBeenCalledTimes(1);
    gate.dispose();
  });
});
