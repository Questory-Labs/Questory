import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FamilyHeader } from "./FamilyHeader";

const base = {
  memberCount: 2,
  steamId: "",
  setSteamId: vi.fn(),
  addBusy: false,
  onAdd: vi.fn(),
  onOpenImport: vi.fn(),
  familyAtCapacity: false,
  remainingSlots: 4,
  addError: null,
};

describe("FamilyHeader", () => {
  afterEach(() => cleanup());

  it("shows seats and remaining capacity", () => {
    render(<FamilyHeader {...base} />);
    expect(screen.getByText("Steam Family · 2 of 6 seats")).toBeInTheDocument();
    expect(screen.getByText(/4 slots left/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add member" })).toBeDisabled();
  });

  it("submits a trimmed steam id and opens import", () => {
    const onAdd = vi.fn();
    const onOpenImport = vi.fn();
    render(
      <FamilyHeader
        {...base}
        steamId="7656"
        onAdd={onAdd}
        onOpenImport={onOpenImport}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add member" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Import from friends" }));
    expect(onOpenImport).toHaveBeenCalledTimes(1);
  });

  it("disables adding at capacity and surfaces errors", () => {
    render(
      <FamilyHeader
        {...base}
        steamId="7656"
        familyAtCapacity
        remainingSlots={0}
        addError="Not a valid SteamID64"
      />,
    );
    expect(screen.getByText(/Family is full/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add member" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Import from friends" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Not a valid SteamID64");
  });
});
