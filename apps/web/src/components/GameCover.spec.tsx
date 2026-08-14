import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameCover } from "./GameCover";

describe("GameCover", () => {
  afterEach(cleanup);

  it("covers the box with the header image", () => {
    const { container } = render(
      <GameCover src="https://cdn.example/header.jpg" alt="Apex Legends" />,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.example/header.jpg");
    expect(img).toHaveAttribute("alt", "Apex Legends");
    expect(img?.className).toContain("absolute");
    expect(img?.className).toContain("object-cover");
  });

  it("shows a hatched fallback when art is missing", () => {
    render(<GameCover src={null} />);
    expect(screen.getByText("No art")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
