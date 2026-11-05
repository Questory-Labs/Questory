import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResourceStore } from "@questorylabs/qhttp/react";
import { invalidateSteamSyncResources } from "./useSyncJobs";

const fakeStore = () => ({ touch: vi.fn() }) as unknown as ResourceStore;

describe("invalidateSteamSyncResources", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refetches once when several sync watchers finish together", async () => {
    vi.useFakeTimers();
    const store = fakeStore();
    invalidateSteamSyncResources(store);
    invalidateSteamSyncResources(store);
    invalidateSteamSyncResources(store);
    expect(store.touch).toHaveBeenCalledTimes(1);
    expect(store.touch).toHaveBeenCalledWith(
      expect.arrayContaining([["library"], ["me"], ["dashboard"]]),
    );
    await Promise.resolve();
    vi.advanceTimersByTime(10_000);
    expect(store.touch).toHaveBeenCalledTimes(1);
  });

  it("refetches again for a later sync", async () => {
    vi.useFakeTimers();
    const store = fakeStore();
    invalidateSteamSyncResources(store);
    await Promise.resolve();
    vi.advanceTimersByTime(5_000);
    invalidateSteamSyncResources(store);
    expect(store.touch).toHaveBeenCalledTimes(2);
  });

  it("reloads after the window when a later sync finishes inside it", async () => {
    vi.useFakeTimers();
    const store = fakeStore();
    invalidateSteamSyncResources(store);
    await Promise.resolve();
    vi.advanceTimersByTime(2_000);
    invalidateSteamSyncResources(store);
    invalidateSteamSyncResources(store);
    expect(store.touch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2_999);
    expect(store.touch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(store.touch).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    vi.advanceTimersByTime(10_000);
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
