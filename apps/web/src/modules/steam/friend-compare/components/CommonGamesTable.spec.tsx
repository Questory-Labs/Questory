import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CommonGamesTable } from "./CommonGamesTable";

describe("CommonGamesTable", () => {
  afterEach(cleanup);

  it("renders hours and scales bars to the top value", () => {
    const { container } = render(
      <CommonGamesTable
        friendName="Gaben"
        games={[
          {
            appId: 1,
            name: "Dota 2",
            headerImage: null,
            yourPlaytimeMinutes: 600,
            friendPlaytimeMinutes: 300,
          },
        ]}
      />,
    );
    const row = screen.getByText("Dota 2").closest("tr")!;
    expect(row).toHaveTextContent("10 h");
    expect(row).toHaveTextContent("5 h");
    const bars = container.querySelectorAll(".q-bar");
    expect((bars[0] as HTMLElement).style.width).toBe("100%");
    expect((bars[1] as HTMLElement).style.width).toBe("50%");
  });

  it("shows an empty message", () => {
    render(<CommonGamesTable friendName="Gaben" games={[]} />);
    expect(screen.getByText("No games in common yet.")).toBeInTheDocument();
  });
});
