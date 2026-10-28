import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameDetail } from "@questorylabs/shared";
import { LibraryGameAchievements } from "./LibraryGameAchievements";
import { LibraryGameCatalog } from "./LibraryGameCatalog";
import { LibraryGameHltb } from "./LibraryGameHltb";
import { LibraryGamePriceSteps } from "./LibraryGamePriceSteps";
import { LibraryGameSessionBars } from "./LibraryGameSessionBars";
import { LibraryGameStatusSelect } from "./LibraryGameStatusSelect";

const detail: GameDetail = {
  appId: 400,
  name: "Portal",
  headerImage: null,
  genres: ["Puzzle"],
  categories: [],
  tags: [],
  developers: ["Valve"],
  publishers: ["Valve"],
  minPlayers: null,
  maxPlayers: null,
  youOwn: true,
  yourPlaytimeHours: 3,
  friendOwners: [],
  price: {
    current: 9.99,
    lowest: 1.99,
    historicalLow: 1.99,
    historicalHigh: 19.99,
    currency: "USD",
    history: [
      { date: "2025-01-01", price: 19.99 },
      { date: "2025-06-01", price: 1.99 },
      { date: "2026-01-01", price: 9.99 },
    ],
  },
  review: null,
  hltb: null,
  platforms: ["windows", "linux"],
  metacriticScore: 90,
};

describe("library game sections", () => {
  afterEach(cleanup);

  it("changes status through the select", () => {
    const onChange = vi.fn();
    render(<LibraryGameStatusSelect status={null} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "backlog" } });
    expect(onChange).toHaveBeenCalledWith("backlog");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("renders 90 day session bars with totals", () => {
    render(
      <LibraryGameSessionBars
        sessions={{
          count: 3,
          avgMinutes: 112,
          days: [
            { date: "2026-10-25", minutes: 0 },
            { date: "2026-10-26", minutes: 60 },
            { date: "2026-10-27", minutes: 276 },
          ],
        }}
      />,
    );
    expect(screen.getByText("Sessions · 3 days")).toBeInTheDocument();
    expect(screen.getByText("1h 52m")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("compares hltb against your hours", () => {
    render(
      <LibraryGameHltb
        hours={12}
        hltb={{ mainHours: 10, extraHours: 15, completionistHours: 30, sourceUrl: null }}
      />,
    );
    expect(screen.getByText("Main story")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("12h")).toBeInTheDocument();
  });

  it("explains a missing hltb match", () => {
    render(<LibraryGameHltb hours={1} hltb={null} />);
    expect(screen.getByText("No HowLongToBeat match found.")).toBeInTheDocument();
  });

  it("lists every achievement with unlock state", () => {
    render(
      <LibraryGameAchievements
        achievements={{
          unlocked: 1,
          total: 2,
          pct: 50,
          global: [
            { name: "a", displayName: "Rare", description: "", percent: 1.5, icon: null, unlocked: true, unlockTime: "2026-05-01T00:00:00.000Z" },
            { name: "b", displayName: "Common", description: "", percent: 80, icon: null, unlocked: false, unlockTime: null },
          ],
        }}
      />,
    );
    expect(screen.getByText("Rare")).toBeInTheDocument();
    expect(screen.getByText(/80\.0% of players · locked/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "50% of achievements unlocked" })).toBeInTheDocument();
  });

  it("draws the price step chart", () => {
    render(<LibraryGamePriceSteps price={detail.price} pricePaid={4} />);
    expect(screen.getByText("Price history")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Price steps between/ })).toBeInTheDocument();
    expect(screen.getByText(/you paid/)).toBeInTheDocument();
  });

  it("shows platforms and metacritic in the catalog", () => {
    render(<LibraryGameCatalog detail={detail} />);
    expect(screen.getByText("Windows · Linux")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
  });
});
