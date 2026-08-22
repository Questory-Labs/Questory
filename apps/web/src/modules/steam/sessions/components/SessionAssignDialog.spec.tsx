import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaySessionItem } from "@questorylabs/shared";
import { SessionAssignDialog } from "./SessionAssignDialog";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";

const session: PlaySessionItem = {
  id: "ps1",
  title: "Unknown Game",
  source: "user",
  appId: null,
  gameId: null,
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T01:00:00.000Z",
  durationSecs: 3600,
  exe: "dota2.exe",
  hostOs: "windows",
  hostName: "desk",
  game: null,
};

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("SessionAssignDialog", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(api).mockReset();
    vi.mocked(api).mockImplementation(async (path: string, init?: RequestInit) => {
      if (String(path).includes("/similar")) {
        return { count: 3, matchKind: "exe", matchValue: "dota2.exe" };
      }
      if (String(path).includes("game-suggest")) {
        return {
          items: [
            { gameId: "g1", name: "Dota 2", headerImage: null, appId: 570 },
          ],
        };
      }
      if (init?.method === "POST") {
        return { ok: true, assignedCount: 3, ruleId: "r1" };
      }
      throw new Error(`unexpected ${path}`);
    });
  });

  it("shows similar count and assigns a library game after confirm", async () => {
    const onClose = vi.fn();
    wrap(
      <SessionAssignDialog open session={session} onClose={onClose} />,
    );

    expect(await screen.findByText(/3 sessions match exe/)).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "dota" } });

    expect(await screen.findByRole("option", { name: "Dota 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dota 2" }));

    expect(
      await screen.findByText(/Assign 3 sessions matching dota2.exe to “Dota 2”/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Assign" }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        "/play-sessions/ps1/assign",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ gameId: "g1" }),
        }),
      );
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
