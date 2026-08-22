import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MediaHistoryView } from "./media.history.view";
import type { MediaHistoryPage } from "./media.history.types";

type Item = { id: string; name: string };

const pageOf = (items: Item[]): MediaHistoryPage<Item> => ({
  items,
  total: items.length,
  pageSize: 15,
});

const renderShell = (
  patch: Parameters<typeof mockResource<MediaHistoryPage<Item>>>[0],
) =>
  render(
    <MediaHistoryView
      recent={mockResource<MediaHistoryPage<Item>>(patch)}
      page={1}
      setPage={() => {}}
      title="History"
      description="Events."
      emptyTitle="No events yet"
      emptyDescription="Connect a source to start syncing."
      errorMessage="Could not load history."
      renderItem={(item) => (
        <li key={item.id}>{item.name}</li>
      )}
    />,
  );

describe("MediaHistoryView", () => {
  afterEach(cleanup);

  it("shows an error when the resource failed", () => {
    renderShell({ empty: true, failed: true });
    expect(screen.getByText("Could not load history.")).toBeInTheDocument();
    expect(screen.queryByText("No events yet")).not.toBeInTheDocument();
  });

  it("shows a skeleton when empty", () => {
    renderShell({ empty: true, failed: false });
    expect(screen.queryByText("No events yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("shows collection empty when ready with no items", () => {
    renderShell({
      empty: false,
      failed: false,
      value: pageOf([]),
    });
    expect(screen.getByText("No events yet")).toBeInTheDocument();
  });

  it("renders rows when ready", () => {
    renderShell({
      empty: false,
      failed: false,
      value: pageOf([{ id: "1", name: "Alpha" }]),
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });
});
