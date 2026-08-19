import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";

vi.mock("@/lib/music", () => ({
  fetchMusicHealth: vi.fn(),
  isMusicFlagEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/watch", () => ({
  fetchWatchHealth: vi.fn(),
  isWatchFlagEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/read", () => ({
  fetchReadHealth: vi.fn(),
  isReadFlagEnabled: vi.fn(() => false),
}));

import { fetchMusicHealth, isMusicFlagEnabled } from "@/lib/music";
import { fetchWatchHealth, isWatchFlagEnabled } from "@/lib/watch";
import { fetchReadHealth, isReadFlagEnabled } from "@/lib/read";
import {
  StatusProvider,
  useMusicEnabled,
  useReadEnabled,
  useStatus,
  useWatchEnabled,
} from "./StatusProvider";

function wrapper({ children }: { children: React.ReactNode }) {
  const store = new ResourceStore({ retries: false });
  return (
    <ResourceProvider store={store}>
      <StatusProvider>{children}</StatusProvider>
    </ResourceProvider>
  );
}

describe("useStatus", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(isMusicFlagEnabled).mockReturnValue(false);
    vi.mocked(isWatchFlagEnabled).mockReturnValue(false);
    vi.mocked(isReadFlagEnabled).mockReturnValue(false);
    vi.mocked(fetchMusicHealth).mockReset();
    vi.mocked(fetchWatchHealth).mockReset();
    vi.mocked(fetchReadHealth).mockReset();
  });

  it("throws when used outside StatusProvider", () => {
    expect(() => renderHook(() => useStatus())).toThrow(
      "useStatus must be used within StatusProvider",
    );
    expect(() => renderHook(() => useMusicEnabled())).toThrow(
      "useStatus must be used within StatusProvider",
    );
  });

  it("skips health fetches when feature flags are off", () => {
    const { result } = renderHook(() => useStatus(), { wrapper });

    expect(result.current.music.flagOn).toBe(false);
    expect(result.current.music.showMusicNav).toBe(false);
    expect(result.current.watch.enabled).toBe(false);
    expect(result.current.read.enabled).toBe(false);
    expect(vi.mocked(fetchMusicHealth)).not.toHaveBeenCalled();
    expect(vi.mocked(fetchWatchHealth)).not.toHaveBeenCalled();
    expect(vi.mocked(fetchReadHealth)).not.toHaveBeenCalled();
  });

  it("enables music nav when the flag is on and health is ok", async () => {
    vi.mocked(isMusicFlagEnabled).mockReturnValue(true);
    vi.mocked(fetchMusicHealth).mockResolvedValue({
      ok: true,
      service: "questorylabs-music",
    });

    const { result } = renderHook(() => useMusicEnabled(), { wrapper });

    await waitFor(() => expect(result.current.showMusicNav).toBe(true));
    expect(result.current.healthOk).toBe(true);
    expect(vi.mocked(fetchMusicHealth)).toHaveBeenCalledTimes(1);
  });

  it("enables watch and read when flags and health are ok", async () => {
    vi.mocked(isWatchFlagEnabled).mockReturnValue(true);
    vi.mocked(isReadFlagEnabled).mockReturnValue(true);
    vi.mocked(fetchWatchHealth).mockResolvedValue({
      ok: true,
      service: "questorylabs-watch",
    });
    vi.mocked(fetchReadHealth).mockResolvedValue({ ok: true });

    const { result } = renderHook(
      () => ({
        watch: useWatchEnabled(),
        read: useReadEnabled(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.watch.enabled).toBe(true));
    expect(result.current.read.showReadNav).toBe(true);
  });

  it("fetches each health endpoint once for multiple consumers", async () => {
    vi.mocked(isMusicFlagEnabled).mockReturnValue(true);
    vi.mocked(fetchMusicHealth).mockResolvedValue({
      ok: true,
      service: "questorylabs-music",
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
    expect(vi.mocked(fetchMusicHealth)).toHaveBeenCalledTimes(1);
  });
});
