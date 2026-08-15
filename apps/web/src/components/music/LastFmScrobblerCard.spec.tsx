import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LastFmScrobblerCard } from "./LastFmScrobblerCard";

vi.mock("@/lib/music", () => ({
  musicFetch: vi.fn(),
  musicUrl: (path: string) => `http://api.test${path}`,
  fetchMusicHealth: vi.fn(),
}));

import { fetchMusicHealth, musicFetch } from "@/lib/music";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

function configuredStatus(overrides: Record<string, unknown> = {}) {
  return {
    nativeScrobbling: false,
    lastfm: {
      configured: true,
      connected: false,
      username: null,
      lastSyncedAt: null,
      lastError: null,
      ...overrides,
    },
  };
}

describe("LastFmScrobblerCard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(musicFetch).mockReset();
    vi.mocked(fetchMusicHealth).mockReset();
    vi.mocked(fetchMusicHealth).mockResolvedValue({
      ok: true,
      service: "questorylabs-music",
      lastfmConfigured: true,
    });
  });

  it("hides the card when Last.fm env is not configured on the API", async () => {
    vi.mocked(fetchMusicHealth).mockResolvedValue({
      ok: true,
      service: "questorylabs-music",
      lastfmConfigured: false,
    });
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(fetchMusicHealth).toHaveBeenCalled();
    });
    expect(screen.queryByText("Last.fm")).not.toBeInTheDocument();
    expect(musicFetch).not.toHaveBeenCalled();
  });

  it("shows Connect when Last.fm is configured and disconnected", async () => {
    vi.mocked(musicFetch).mockResolvedValue(configuredStatus());
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Connect Last.fm" }),
      ).toBeInTheDocument();
    });
  });

  it("shows connected username and disconnect", async () => {
    vi.mocked(musicFetch).mockResolvedValue(
      configuredStatus({
        connected: true,
        username: "santosh",
        lastSyncedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(screen.getByText(/Connected as santosh/)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Disconnect" }),
    ).toBeInTheDocument();
  });

  it("shows a status error instead of hiding when health says Last.fm is on", async () => {
    vi.mocked(musicFetch).mockRejectedValue(
      new Error("column lastError does not exist"),
    );
    wrap(<LastFmScrobblerCard />);
    await waitFor(() => {
      expect(
        screen.getByText(/Could not load Last.fm status/),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Last.fm")).toBeInTheDocument();
  });

  it("warns that ListenBrainz ingest will be disabled before authorize", async () => {
    vi.mocked(musicFetch).mockResolvedValue(configuredStatus());
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
