import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SummaryTiles } from "./SummaryTiles";

describe("SummaryTiles", () => {
  afterEach(cleanup);

  it("renders nothing without data", () => {
    const { container } = render(<SummaryTiles />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links needs-you to sessions when only sessions are unmatched", () => {
    render(
      <SummaryTiles
        syncedSources={4}
        needsYou={{ total: 2, failedSyncs: 0, unmatchedSessions: 2, unreadNotifications: 0 }}
      />,
    );
    expect(screen.getByText("Sources synced")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Needs you/ });
    expect(link).toHaveAttribute("href", "/sessions");
    expect(link).toHaveTextContent("2 unmatched sessions");
  });

  it("links needs-you to connections when a sync failed", () => {
    render(
      <SummaryTiles
        needsYou={{ total: 2, failedSyncs: 1, unmatchedSessions: 1, unreadNotifications: 0 }}
      />,
    );
    expect(screen.queryByText("Sources synced")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Needs you/ })).toHaveAttribute(
      "href",
      "/settings/connections",
    );
  });
});
