import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResourceStore } from "@questorylabs/qhttp/react";
import { invalidateSteamSyncResources } from "./useSyncJobs";

const fakeStore = () => ({ touch: vi.fn() }) as unknown as ResourceStore;

describe("invalidateSteamSyncResources", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refetches once when several sync watchers finish together", () => {
    const store = fakeStore();
    invalidateSteamSyncResources(store);
    invalidateSteamSyncResources(store);
    invalidateSteamSyncResources(store);
    expect(store.touch).toHaveBeenCalledTimes(1);
    expect(store.touch).toHaveBeenCalledWith(
      expect.arrayContaining([["library"], ["me"], ["dashboard"]]),
    );
  });

  it("refetches again for a later sync", () => {
    vi.useFakeTimers();
    const store = fakeStore();
    invalidateSteamSyncResources(store);
    vi.advanceTimersByTime(5_000);
    invalidateSteamSyncResources(store);
    expect(store.touch).toHaveBeenCalledTimes(2);
  });

  it("tracks each store separately", () => {
    const first = fakeStore();
    const second = fakeStore();
    invalidateSteamSyncResources(first);
    invalidateSteamSyncResources(second);
    expect(first.touch).toHaveBeenCalledTimes(1);
    expect(second.touch).toHaveBeenCalledTimes(1);
  });
});
