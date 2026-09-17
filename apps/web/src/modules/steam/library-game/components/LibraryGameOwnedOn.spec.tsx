import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LibraryEntry } from "@questorylabs/shared";
import { LibraryGameOwnedOn } from "./LibraryGameOwnedOn";

const entry = (stores: LibraryEntry["ownerships"]): LibraryEntry => ({
  id: "entry-1",
  playtimeForever: 180,
  stores: stores?.map((o) => o.store),
  ownerships: stores,
  game: {
    id: "game-1",
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: [],
    categories: [],
    tags: [],
    developers: [],
    publishers: [],
  },
});

describe("LibraryGameOwnedOn", () => {
  it("hides a single-store library", () => {
    const { container } = render(
      <LibraryGameOwnedOn
        entry={entry([{ store: "steam", playtimeForever: 180, listing: null }])}
        currency="USD"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists each store", () => {
    render(
      <LibraryGameOwnedOn
        entry={entry([
          { store: "steam", playtimeForever: 180, listing: null },
          { store: "epic", playtimeForever: 0, listing: null },
        ])}
        currency="USD"
      />,
    );
    expect(screen.getByText("Owned on")).toBeInTheDocument();
    expect(screen.getByText("Steam")).toBeInTheDocument();
    expect(screen.getByText("Epic")).toBeInTheDocument();
  });
});
