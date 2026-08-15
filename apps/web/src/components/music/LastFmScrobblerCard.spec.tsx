import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LastFmScrobblerCard } from "./LastFmScrobblerCard";

vi.mock("@/lib/music", () => ({
  musicFetch: vi.fn(),
  musicUrl: (path: string) => `http://api.test${path}`,
}));

import { musicFetch } from "@/lib/music";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("LastFmScrobblerCard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(musicFetch).mockReset();
  });

  it("shows Connect when Last.fm is configured and disconnected", async () => {
    vi.mocked(musicFetch).mockResolvedValue({
      nativeScrobbling: false,
      lastfm: {
        configured: true,
        connected: false,
        username: null,
        lastSyncedAt: null,
        lastError: null,
      },
    });
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Connect Last.fm" }),
      ).toBeInTheDocument();
    });
  });

  it("shows connected username and disconnect", async () => {
    vi.mocked(musicFetch).mockResolvedValue({
      nativeScrobbling: true,
      lastfm: {
        configured: true,
        connected: true,
        username: "santosh",
        lastSyncedAt: "2026-01-01T00:00:00.000Z",
        lastError: null,
      },
    });
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Connected as santosh/)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Disconnect" }),
    ).toBeInTheDocument();
  });

  it("warns that ListenBrainz ingest will be disabled before authorize", async () => {
    vi.mocked(musicFetch).mockResolvedValue({
      nativeScrobbling: false,
      lastfm: {
        configured: true,
        connected: false,
        username: null,
        lastSyncedAt: null,
        lastError: null,
      },
    });
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Connect Last.fm" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Connect Last.fm" })[0]);
    expect(
      screen.getByText(/disables ListenBrainz-compatible ingest/),
    ).toBeInTheDocument();
  });
});
