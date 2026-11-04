import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LibraryFilters } from "./LibraryFilters";

describe("LibraryFilters", () => {
  afterEach(cleanup);

  it("uses designed field controls, not three naked checkboxes", () => {
    render(
      <LibraryFilters
        genre=""
        unplayed={false}
        multiplayer={false}
        deck={false}
        onGenreChange={vi.fn()}
        onUnplayedChange={vi.fn()}
        onMultiplayerChange={vi.fn()}
        onDeckChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Any")).toHaveClass("field");
    expect(screen.getByText("Unplayed").closest("label")).toHaveClass(
      "field-check",
    );
    expect(document.querySelector(".panel-outline")).toBeTruthy();
  });

  it("keeps the genre field and checkboxes on one centered row", () => {
    render(
      <LibraryFilters
        genre=""
        unplayed={false}
        multiplayer={false}
        deck={false}
        onGenreChange={vi.fn()}
        onUnplayedChange={vi.fn()}
        onMultiplayerChange={vi.fn()}
        onDeckChange={vi.fn()}
      />,
    );
    const panel = document.querySelector(".panel-outline");
    expect(panel).toHaveClass("items-center");
    expect(panel).not.toHaveClass("mb-6");
    expect(screen.getByText("Genre").closest("label")).toHaveClass("items-center");
  });
});
