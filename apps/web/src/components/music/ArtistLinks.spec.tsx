import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ArtistLinks } from "./ArtistLinks";

describe("ArtistLinks", () => {
  afterEach(() => {
    cleanup();
  });
  it("links individual names when they match the credit", () => {
    render(
      <ArtistLinks
        artists={[
          { id: "a1", name: "Amit Trivedi" },
          { id: "a2", name: "Shreya Ghoshal" },
        ]}
        fallbackArtistId="a1"
        fallbackArtistName="Amit Trivedi, Shreya Ghoshal"
      />,
    );

    expect(screen.getByRole("link", { name: "Amit Trivedi" })).toHaveAttribute(
      "href",
      "/music/artists/a1",
    );
    expect(screen.getByRole("link", { name: "Shreya Ghoshal" })).toHaveAttribute(
      "href",
      "/music/artists/a2",
    );
  });

  it("shows a differing credit string plus individual links", () => {
    render(
      <ArtistLinks
        artists={[
          { id: "a1", name: "Amit Trivedi" },
          { id: "a2", name: "Shreya Ghoshal" },
        ]}
        fallbackArtistId="a1"
        fallbackArtistName="Amit Trivedi & Shreya Ghoshal"
      />,
    );

    expect(screen.getByText("Amit Trivedi & Shreya Ghoshal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Amit Trivedi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shreya Ghoshal" })).toBeInTheDocument();
  });
});
