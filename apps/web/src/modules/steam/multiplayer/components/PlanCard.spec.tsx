import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { MultiplayerPlanGame } from "@questorylabs/shared";
import { PlanCard } from "./PlanCard";

const game: MultiplayerPlanGame = {
  appId: 1,
  name: "Valheim",
  headerImage: null,
  genres: ["Survival"],
  categories: [],
  releaseYear: 2021,
  reviewScore: 90,
  minPlayers: 1,
  maxPlayers: 10,
  playerMaxes: [10],
  playerCountSource: "igdb",
  isSuggested: true,
  ownedByYou: false,
  ownedByFriends: [],
  missingFriends: [],
  ownership: "unowned",
  currentPrice: 19.99,
  currency: "USD",
};

describe("PlanCard", () => {
  afterEach(cleanup);

  it("shows meta, MAX chip with source and suggested price", () => {
    render(
      <PlanCard game={game} index={0} friendCount={2} onSelect={() => undefined} />,
    );
    expect(screen.getByText("1–10 players · 2021 · Survival · ★ 90")).toBeInTheDocument();
    expect(screen.getByTitle("IGDB mode maxes")).toBeInTheDocument();
    expect(screen.getByText(/Suggested · .*19\.99/)).toBeInTheDocument();
    expect(screen.getByText("Owned by none, fits the group")).toBeInTheDocument();
  });
});
