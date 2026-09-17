import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameDetail } from "@questorylabs/shared";
import { GameAchievementsSection, GameHltbSection } from "./game-progress";

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
    hltb: {
      mainHours: 10,
      extraHours: 15,
      completionistHours: 20,
      sourceUrl: null,
    },
    ...patch,
  }) as GameDetail;

describe("GameHltbSection", () => {
  it("shows main-story hours", () => {
    render(<GameHltbSection detail={detail()} playtimeHours={3} />);
    expect(screen.getByText("HowLongToBeat")).toBeInTheDocument();
    expect(screen.getByText("10h")).toBeInTheDocument();
  });
});

describe("GameAchievementsSection", () => {
  it("renders nothing without achievement data", () => {
    const { container } = render(
      <GameAchievementsSection detail={detail({ achievements: null })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
