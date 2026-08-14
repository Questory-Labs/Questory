import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import type { PlaySessionPage } from "@questorylabs/shared";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";
import SessionsPage from "./page";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

const emptyPage: PlaySessionPage = {
  total: 0,
  page: 1,
  pageSize: 15,
  items: [],
};

const populated: PlaySessionPage = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [
    {
      id: "ps1",
      title: "Dota 2",
      source: "steam",
      appId: 570,
      gameId: "g1",
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T01:00:00.000Z",
      durationSecs: 3600,
      exe: "dota2.exe",
      hostOs: "windows",
      hostName: "desk",
      game: {
        id: "g1",
        name: "Dota 2",
        headerImage: null,
        appId: 570,
      },
    },
  ],
};

describe("SessionsPage", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  it("shows empty state when there are no sessions", async () => {
    vi.mocked(api).mockResolvedValue(emptyPage);
    wrap(<SessionsPage />);
    expect(await screen.findByText("No sessions yet")).toBeInTheDocument();
  });

  it("renders a session row when data is present", async () => {
    vi.mocked(api).mockResolvedValue(populated);
    wrap(<SessionsPage />);
    expect(await screen.findByText("Dota 2")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/1h/).textContent).toMatch(/steam/);
    });
    expect(screen.getByRole("link", { name: "Dota 2" })).toHaveAttribute(
      "href",
      "/library/g1",
    );
    expect(screen.getByRole("button", { name: "Assign" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
