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
});
