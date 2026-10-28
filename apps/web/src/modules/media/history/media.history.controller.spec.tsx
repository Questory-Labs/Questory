import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { MediaHistoryController } from "./media.history.controller";

const Probe = (props: Record<string, unknown>) => {
  const { page, setPage, flag } = props as { page: number; setPage: (n: number) => void; flag: string };
  return (
    <button type="button" onClick={() => setPage(page + 1)}>
      page {page} {flag}
    </button>
  );
};

const renderController = (filterKey: string, load: (page: number) => Promise<unknown>) => (
  <MediaHistoryController resourceKey="test-history" filterKey={filterKey} extra={{ flag: "x" }} load={load as never}>
    <Probe />
  </MediaHistoryController>
);

describe("MediaHistoryController", () => {
  afterEach(cleanup);

  it("loads pages and resets paging when the filter changes", async () => {
    const load = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const store = new ResourceStore({ retries: false });
    const { rerender } = render(<ResourceProvider store={store}>{renderController("a", load)}</ResourceProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("page 1 x");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("page 2");
    await waitFor(() => expect(load).toHaveBeenCalledWith(2));
    rerender(<ResourceProvider store={store}>{renderController("b", load)}</ResourceProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("page 1");
  });
});
