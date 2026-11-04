import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mockResource } from "@/test/resource-mock";
import { ReadHistoryView } from "./read.history.view";

const event = {
  id: "e1",
  readAt: "2026-08-01T20:00:00.000Z",
  source: "anilist",
  status: "reading",
  chaptersRead: 12,
  volumesRead: null,
  progress: 30,
  title: { id: "t1", name: "Berserk", format: "manga", coverUrl: null },
};

const renderView = (recent: unknown) =>
  render(<ReadHistoryView {...{ recent, page: 1, setPage: vi.fn() }} />);

describe("ReadHistoryView", () => {
  afterEach(cleanup);

  it("renders reading events with view tabs", () => {
    renderView(mockResource({ empty: false, failed: false, value: { items: [event], total: 1, page: 1, pageSize: 20 } }));
    expect(screen.getByRole("link", { name: "Berserk · Ch. 12" })).toHaveAttribute("href", "/read/titles/t1");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
  });

  it("shows empty and error states", () => {
    renderView(mockResource({ empty: false, failed: false, value: { items: [], total: 0, page: 1, pageSize: 20 } }));
    expect(screen.getByText("No reading events yet")).toBeInTheDocument();
    cleanup();
    renderView(mockResource({ empty: true, failed: true }));
    expect(screen.getByText("Could not load read history.")).toBeInTheDocument();
  });
});
