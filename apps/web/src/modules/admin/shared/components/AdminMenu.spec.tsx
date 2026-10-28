import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminMenu } from "./AdminMenu";

describe("AdminMenu", () => {
  afterEach(cleanup);

  const setup = () => {
    const onA = vi.fn();
    const onB = vi.fn();
    render(
      <AdminMenu
        trigger="⋯"
        triggerLabel="More"
        title="More actions"
        triggerClassName=""
        items={[
          { key: "a", label: "Alpha", onSelect: onA },
          { key: "b", label: "Bravo", onSelect: onB, danger: true, separatorBefore: true },
          { key: "c", label: "Charlie", onSelect: vi.fn(), disabled: true },
        ]}
      />,
    );
    return { onA, onB };
  };

  it("opens, selects and closes", () => {
    const { onA } = setup();
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("More actions")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Charlie" })).toBeDisabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Alpha" }));
    expect(onA).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape and outside click", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
