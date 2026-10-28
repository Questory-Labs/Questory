import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SearchRowBody } from "./SearchRowBody";

describe("SearchRowBody", () => {
  afterEach(cleanup);

  it("shows an abbreviation tile, meta and kind", () => {
    render(
      <div>
        <SearchRowBody
          item={{
            id: "game-library-1",
            label: "Portal 2",
            href: "/library/g1",
            group: "Games",
            domain: "games",
            kind: "Library",
            meta: "14h total",
          }}
        />
      </div>,
    );
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getByText("14h total")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  it("uses the image when present", () => {
    const { container } = render(
      <div>
        <SearchRowBody
          item={{
            id: "movie-1",
            label: "Heat",
            href: "/watch/titles/1",
            group: "Movies",
            domain: "watch",
            kind: "Movie",
            image: "https://img.example/heat.jpg",
          }}
        />
      </div>,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://img.example/heat.jpg");
    expect(screen.queryByText("HE")).toBeNull();
  });
});
