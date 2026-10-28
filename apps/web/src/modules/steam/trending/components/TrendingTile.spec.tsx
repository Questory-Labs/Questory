import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TrendingBadge, TrendingTile } from "./TrendingTile";

describe("TrendingTile", () => {
  afterEach(cleanup);

  it("pads the rank and shows meta and badges", () => {
    render(
      <ol>
        <TrendingTile
          name="Hades II"
          imageUrl="https://cdn.example/h.jpg"
          rank={3}
          meta="1.2k peak"
          badges={<TrendingBadge tone="owned">Owned</TrendingBadge>}
        />
      </ol>,
    );
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("1.2k peak")).toBeInTheDocument();
    expect(screen.getByText("Owned")).toBeInTheDocument();
  });

  it("renders a button when clickable", () => {
    const onClick = vi.fn();
    render(
      <ol>
        <TrendingTile name="Portal 2" imageUrl={null} rank={1} onClick={onClick} />
      </ol>,
    );
    expect(screen.getByText("No art")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Portal 2/ }));
    expect(onClick).toHaveBeenCalled();
  });

  it("links out when given an href", () => {
    render(
      <ol>
        <TrendingTile name="One Piece" imageUrl={null} rank={12} href="https://anilist.co/manga/1" />
      </ol>,
    );
    expect(screen.getByRole("link", { name: /One Piece/ })).toHaveAttribute(
      "href",
      "https://anilist.co/manga/1",
    );
  });
});
