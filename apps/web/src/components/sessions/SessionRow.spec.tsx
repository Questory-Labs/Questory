import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaySessionItem } from "@questorylabs/shared";
import { SessionRow } from "./SessionRow";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

const item: PlaySessionItem = {
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
};

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("SessionRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens a confirmation dialog before delete", () => {
    wrap(<SessionRow item={item} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Permanently delete this play session/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete session?" })).toBeInTheDocument();
  });
});
