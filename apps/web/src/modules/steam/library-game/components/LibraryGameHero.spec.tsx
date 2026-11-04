import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { LibraryEntry } from "@questorylabs/shared";
import { LibraryGameHero } from "./LibraryGameHero";

const entry: LibraryEntry = {
  id: "entry-1",
  playtimeForever: 180,
  playtime2Weeks: 30,
  lastPlayedAt: "2026-09-11T12:00:00.000Z",
  stores: ["steam"],
  ownerships: [{ store: "steam", playtimeForever: 180, listing: null }],
  game: {
    id: "game-1",
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: ["Puzzle"],
    categories: [],
    tags: [],
    developers: ["Valve"],
    publishers: ["Valve"],
    currentPrice: 9.99,
  },
};

describe("LibraryGameHero", () => {
  it("shows playtime, play, and a back link", () => {
    render(<LibraryGameHero entry={entry} />);
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByRole("link", { name: "Play Portal" })).toBeInTheDocument();
  });

  it("renders the editable status and achievement ring", () => {
    const onStatusChange = vi.fn();
    render(
      <LibraryGameHero
        entry={{ ...entry, pricePaid: 6 }}
        status="playing"
        onStatusChange={onStatusChange}
        detail={{
          appId: 400,
          name: "Portal",
          headerImage: null,
          genres: [],
          categories: [],
          tags: [],
          developers: [],
          publishers: [],
          minPlayers: 1,
          maxPlayers: 4,
          youOwn: true,
          yourPlaytimeHours: 3,
          friendOwners: [],
          price: { current: 9.99, lowest: null, historicalLow: null, historicalHigh: null, currency: "USD", history: [] },
          review: null,
          hltb: null,
          achievements: { unlocked: 5, total: 10, pct: 50, global: [] },
        }}
      />,
    );
    expect(screen.getByText("1–4 players")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "50% achievements" })).toBeInTheDocument();
    expect(screen.getByText("Per hour")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "finished" } });
    expect(onStatusChange).toHaveBeenCalledWith("finished");
  });

  it("uses queue copy when unplayed", () => {
    render(
      <LibraryGameHero
        entry={{ ...entry, playtimeForever: 0, lastPlayedAt: null }}
      />,
    );
    expect(screen.getByText("0h")).toBeInTheDocument();
    expect(screen.getByText("Still in the queue")).toBeInTheDocument();
  });
});
