import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import type { AppStatus } from "@questorylabs/shared";
import { FEATURE_SOURCES } from "@questorylabs/shared";

vi.mock("@/lib/app-status", async () => {
  const actual = await vi.importActual<typeof import("@/lib/app-status")>(
    "@/lib/app-status",
  );
  return {
    ...actual,
    fetchAppStatus: vi.fn(),
  };
});

import { fetchAppStatus } from "@/lib/app-status";
import {
  DropEpochProvider,
  StatusProvider,
  useDropEpochBump,
  useFeatureSources,
  useMusicEnabled,
  useReadEnabled,
  useStatus,
  useWatchEnabled,
} from "./StatusProvider";

const allSourcesOn = Object.fromEntries(
  FEATURE_SOURCES.map((id) => [id, true]),
) as AppStatus["sources"];

function wrapper({ children }: { children: React.ReactNode }) {
  const store = new ResourceStore({ retries: false });
  return (
    <ResourceProvider store={store}>
      <DropEpochProvider>
        <StatusProvider>{children}</StatusProvider>
      </DropEpochProvider>
    </ResourceProvider>
  );
}

describe("useStatus", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(fetchAppStatus).mockReset();
  });

  it("throws when used outside StatusProvider", () => {
    expect(() => renderHook(() => useStatus())).toThrow(
      "useStatus must be used within StatusProvider",
    );
  });

  it("waits on empty status instead of treating domains as off", () => {
    vi.mocked(fetchAppStatus).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useStatus(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.music.showMusicNav).toBe(false);
    expect(result.current.music.flagOn).toBe(false);
  });

  it("enables nav from GET /v1/status", async () => {
    vi.mocked(fetchAppStatus).mockResolvedValue({
      music: { enabled: true },
      watch: { enabled: true },
      read: { enabled: false },
      sources: { ...allSourcesOn, anilist: false },
    });

    const { result } = renderHook(
      () => ({
        music: useMusicEnabled(),
        watch: useWatchEnabled(),
        read: useReadEnabled(),
        sources: useFeatureSources(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.music.showMusicNav).toBe(true));
    expect(result.current.watch.enabled).toBe(true);
    expect(result.current.read.showReadNav).toBe(false);
    expect(result.current.sources.anilist).toBe(false);
    expect(vi.mocked(fetchAppStatus)).toHaveBeenCalledTimes(1);
  });

  it("fetches status once for multiple consumers", async () => {
    vi.mocked(fetchAppStatus).mockResolvedValue({
      music: { enabled: true },
      watch: { enabled: false },
      read: { enabled: false },
      sources: allSourcesOn,
    });

    const { result } = renderHook(
      () => ({
        first: useMusicEnabled(),
        second: useMusicEnabled(),
        status: useStatus(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.first.showMusicNav).toBe(true));
    expect(result.current.second).toBe(result.current.first);
    expect(result.current.status.music).toBe(result.current.first);
    expect(vi.mocked(fetchAppStatus)).toHaveBeenCalledTimes(1);
  });

  it("marks failed status without treating domains as enabled", async () => {
    vi.mocked(fetchAppStatus).mockImplementation(() =>
      Promise.reject(new Error("down")),
    );
    const { result } = renderHook(() => useStatus(), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.music.showMusicNav).toBe(false);
  });

  it("reloads status after store.drop()", async () => {
    const store = new ResourceStore({ retries: false });
    const dropWrapper = ({ children }: { children: React.ReactNode }) => (
      <ResourceProvider store={store}>
        <DropEpochProvider>
          <StatusProvider>{children}</StatusProvider>
        </DropEpochProvider>
      </ResourceProvider>
    );
    vi.mocked(fetchAppStatus).mockResolvedValue({
      music: { enabled: true },
      watch: { enabled: false },
      read: { enabled: false },
      sources: allSourcesOn,
    });
    const { result } = renderHook(
      () => ({
        music: useMusicEnabled(),
        bump: useDropEpochBump(),
      }),
      { wrapper: dropWrapper },
    );
    await waitFor(() => expect(result.current.music.showMusicNav).toBe(true));
    vi.mocked(fetchAppStatus).mockClear();
    vi.mocked(fetchAppStatus).mockResolvedValue({
      music: { enabled: false },
      watch: { enabled: false },
      read: { enabled: false },
      sources: allSourcesOn,
    });
    store.drop();
    act(() => {
      result.current.bump();
    });
    await waitFor(() =>
      expect(vi.mocked(fetchAppStatus)).toHaveBeenCalled(),
    );
  });
});
