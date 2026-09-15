import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
    const { container } = render(<LibraryGameHero entry={entry} />);
    expect(screen.getByRole("heading", { name: "Portal" })).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByRole("link", { name: "Play Portal" })).toBeInTheDocument();
    const cover = container.querySelector(".aspect-\\[460\\/215\\]")?.parentElement;
    expect(cover?.className).not.toContain("grow");
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
