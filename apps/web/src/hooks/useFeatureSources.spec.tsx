import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { AppStatus } from "@questorylabs/shared";
import { FEATURE_SOURCES } from "@questorylabs/shared";

vi.mock("@/lib/app-status", async () => {
  const actual = await vi.importActual<typeof import("@/lib/app-status")>("@/lib/app-status");
  return { ...actual, fetchAppStatus: vi.fn() };
});

import { fetchAppStatus } from "@/lib/app-status";
import { DropEpochProvider, StatusProvider } from "@/providers/StatusProvider";
import { useFeatureSources } from "./useFeatureSources";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ResourceProvider store={new ResourceStore({ retries: false })}>
    <DropEpochProvider>
      <StatusProvider>{children}</StatusProvider>
    </DropEpochProvider>
  </ResourceProvider>
);

const allOn = Object.fromEntries(FEATURE_SOURCES.map((id) => [id, true])) as AppStatus["sources"];

const status = (sources: AppStatus["sources"]): AppStatus => ({
  demo: { enabled: false },
  music: { enabled: true },
  watch: { enabled: true },
  read: { enabled: true },
  sources,
});

describe("useFeatureSources", () => {
  beforeEach(() => {
    vi.mocked(fetchAppStatus).mockReset();
  });
  afterEach(cleanup);

  it("throws outside StatusProvider", () => {
    expect(() => renderHook(() => useFeatureSources())).toThrow("useStatus must be used within StatusProvider");
  });

  it("defaults every feature source on while status is loading", () => {
    vi.mocked(fetchAppStatus).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useFeatureSources(), { wrapper });
    expect(result.current).toEqual(allOn);
  });

  it("returns the server flags once loaded", async () => {
    vi.mocked(fetchAppStatus).mockResolvedValue(status({ ...allOn, trakt: false, letterboxdScrape: false }));
    const { result } = renderHook(() => useFeatureSources(), { wrapper });
    await waitFor(() => expect(result.current.trakt).toBe(false));
    expect(result.current.letterboxdScrape).toBe(false);
    expect(result.current.anilist).toBe(true);
    expect(result.current.lastfm).toBe(true);
  });

  it("keeps default flags when status fails", async () => {
    vi.mocked(fetchAppStatus).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useFeatureSources(), { wrapper });
    await waitFor(() => expect(fetchAppStatus).toHaveBeenCalled());
    expect(result.current).toEqual(allOn);
  });
});
