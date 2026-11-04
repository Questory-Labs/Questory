import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FamilyInsights } from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FamilyShareablePanel, FamilyWishlistGapsPanel } from "./FamilyWishlistPanels";

const insights = {
  linkedMemberCount: 3,
  shareableNow: [
    {
      appId: 10,
      name: "Celeste",
      headerImage: null,
      direction: "fromYou",
      ownerSteamId: "1",
      ownerName: "Sam",
      wantedBySteamId: "2",
      wantedByName: "Alex",
    },
  ],
  wishlistGaps: [
    { appId: 11, name: "Hades II", headerImage: null, currentPrice: 20, wantedBy: ["Sam", "Alex"] },
  ],
} as unknown as FamilyInsights;

describe("FamilyWishlistPanels", () => {
  afterEach(() => cleanup());

  it("lists shareable games with direction and the linked note", () => {
    const setSelectedAppId = vi.fn();
    render(<FamilyShareablePanel insights={insights} setSelectedAppId={setSelectedAppId} />);
    expect(screen.getByText("You → Alex")).toBeInTheDocument();
    expect(screen.getByText(/\(3 linked\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Celeste/ }));
    expect(setSelectedAppId).toHaveBeenCalledWith(10);
  });

  it("lists wishlist gaps with member count and price", () => {
    render(
      <FamilyWishlistGapsPanel
        insights={insights}
        money={(n) => `$${n}`}
        setSelectedAppId={vi.fn()}
      />,
    );
    const detail = screen.getByText("2 members · $20");
    expect(detail).toHaveAttribute("title", "Sam, Alex");
  });

  it("shows empty states", () => {
    const empty = { linkedMemberCount: 1, shareableNow: [], wishlistGaps: [] } as unknown as FamilyInsights;
    render(
      <>
        <FamilyShareablePanel insights={empty} setSelectedAppId={vi.fn()} />
        <FamilyWishlistGapsPanel insights={empty} money={String} setSelectedAppId={vi.fn()} />
      </>,
    );
    expect(screen.getByText(/Nothing on a linked member's wishlist/)).toBeInTheDocument();
    expect(screen.getByText(/No game is wanted by two or more/)).toBeInTheDocument();
  });
});
