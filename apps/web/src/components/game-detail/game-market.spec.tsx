import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameDetail } from "@questorylabs/shared";
import { GamePlayersSection, GamePriceSection } from "./game-market";

const detail = (patch: Partial<GameDetail> = {}): GameDetail =>
  ({
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: [],
    categories: [],
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
    onlinePlayers: {
      current: 12,
      peak24h: 40,
      peakAllTime: 100,
      history: [],
    },
    ...patch,
  }) as GameDetail;

describe("GamePriceSection", () => {
  it("shows current price", () => {
    render(<GamePriceSection detail={detail()} chartSize="sm" />);
    expect(screen.getByText("Price")).toBeInTheDocument();
  });
});

describe("GamePlayersSection", () => {
  it("shows current players", () => {
    render(<GamePlayersSection detail={detail()} chartSize="sm" />);
    expect(screen.getByText("Players online")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
