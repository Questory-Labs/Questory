import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CostRoiRow } from "@questorylabs/shared";
import { CostGameList } from "./CostGameList";

const row = (patch: Partial<CostRoiRow> = {}): CostRoiRow => ({
  gameId: "game-1",
  appId: 400,
  name: "Portal",
  headerImage: null,
  stores: ["steam"],
  amount: 10,
  currentPrice: 8,
  lowestPrice: 5,
  hours: 20,
  costPerHour: 0.5,
  priceSource: "store",
  ...patch,
});

describe("CostGameList", () => {
  afterEach(cleanup);

  it("shows the empty message when there are no rows", () => {
    render(
      <CostGameList
        rows={[]}
        currency="USD"
        emptyMessage="Nothing to rank."
      />,
    );
    expect(screen.getByText("Nothing to rank.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("puts cost per hour on the right and playtime under the name", () => {
    render(
      <CostGameList rows={[row()]} currency="USD" emptyMessage="empty" />,
    );
    expect(screen.getByRole("link", { name: /Portal/ })).toHaveAttribute(
      "href",
      "/library/game-1",
    );
    expect(screen.getByText(/20h played/)).toBeInTheDocument();
    expect(screen.getByText(/0\.5\/h/)).toBeInTheDocument();
  });

  it("leads with estimated value for the unplayed list", () => {
    render(
      <CostGameList
        rows={[row({ hours: 0, costPerHour: null })]}
        currency="USD"
        emptyMessage="empty"
        showRoi={false}
      />,
    );
    expect(screen.queryByText(/played/)).not.toBeInTheDocument();
    expect(screen.getByText(/Now/)).toBeInTheDocument();
  });
});
