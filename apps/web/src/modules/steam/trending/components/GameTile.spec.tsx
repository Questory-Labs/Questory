import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameTile } from "../../../../components/GameTile";

describe("GameTile", () => {
  afterEach(cleanup);

  it("covers header art inside the tile", () => {
    const { container } = render(
      <GameTile name="Apex Legends" headerImage="https://cdn.example/apex.jpg" />,
    );
    expect(screen.getByText("Apex Legends")).toBeInTheDocument();
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.example/apex.jpg");
    expect(img?.className).toContain("object-cover");
    expect(img?.className).toContain("absolute");
  });

  it("shows a fallback when header art is missing", () => {
    render(<GameTile name="Unknown" headerImage={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("No art")).toBeInTheDocument();
  });

  it("does not stretch the cover with grow", () => {
    const { container } = render(
      <GameTile name="Apex Legends" headerImage="https://cdn.example/apex.jpg" />,
    );
    const cover = container.querySelector(".aspect-\\[460\\/215\\]")?.parentElement;
    expect(cover?.className).not.toContain("grow");
  });

  it("skips entrance motion and cover zoom when reduced-motion is set", () => {
    const { container } = render(
      <GameTile name="Apex Legends" headerImage="https://cdn.example/apex.jpg" />,
    );
    const img = container.querySelector("img");
    expect(img?.className).toContain("motion-reduce:group-hover:scale-100");
    expect(container.querySelector("[style*='opacity']")).toBeNull();
  });
});
