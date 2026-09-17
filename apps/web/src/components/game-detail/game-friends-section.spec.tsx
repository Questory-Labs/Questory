import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameDetail } from "@questorylabs/shared";
import { GameFriendsSection } from "./game-friends-section";

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
    ...patch,
  }) as GameDetail;

describe("GameFriendsSection", () => {
  it("shows an empty message when nobody owns it", () => {
    render(<GameFriendsSection detail={detail()} />);
    expect(screen.getByText("No synced friends own this yet.")).toBeInTheDocument();
  });

  it("lists friend owners", () => {
    render(
      <GameFriendsSection
        detail={detail({
          friendOwners: [
            {
              steamId: "1",
              personaName: "Chell",
              avatarUrl: null,
              playtimeForever: 120,
              playtimeHours: 2,
            },
          ],
        })}
      />,
    );
    expect(screen.getByText("Chell")).toBeInTheDocument();
  });
});
