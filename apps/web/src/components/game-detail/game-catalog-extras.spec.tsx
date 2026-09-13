import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameDetail } from "@questorylabs/shared";
import { GameCatalogExtras } from "./game-catalog-extras";

const detail = (patch: Partial<GameDetail> = {}): GameDetail =>
  ({
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: ["Puzzle"],
    categories: ["Single-player"],
    tags: [],
    developers: [],
    publishers: [],
    minPlayers: null,
    maxPlayers: null,
    youOwn: true,
    yourPlaytimeHours: 3,
    friendOwners: [],
    price: {
      current: 9.99,
      lowest: 4.99,
      historicalLow: 4.99,
      historicalHigh: 19.99,
      currency: "USD",
      history: [],
    },
    review: null,
    hltb: null,
    ...patch,
  }) as GameDetail;

describe("GameCatalogExtras", () => {
  it("renders tags and features", () => {
    render(<GameCatalogExtras detail={detail()} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Puzzle")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
  });
});
