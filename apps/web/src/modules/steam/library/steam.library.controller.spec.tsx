import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider } from "@questorylabs/qhttp/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { LibraryController } from "./steam.library.controller";
import type { LibraryViewProps } from "./steam.library.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api", () => ({ api: vi.fn() }));
vi.mock("@/hooks/useSyncJobs", () => ({
  useSyncJobs: () => ({ active: false }),
}));

const pageResponse = (page: number) => ({
  total: 100,
  page,
  pageSize: 24,
  items: [{ id: `entry-${page}` }],
});

let latest: LibraryViewProps;
const Probe = (props: Partial<LibraryViewProps>) => {
  latest = props as LibraryViewProps;
  const library = props.library;
  return (
    <div>
      <span>{library?.empty ? "skeleton" : "list"}</span>
      <span>{library?.value?.items[0]?.id}</span>
    </div>
  );
};

describe("LibraryController", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the current page visible while the next page loads", async () => {
    let releaseNext: (value: unknown) => void = () => undefined;
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path.startsWith("/collections")) return [];
      if (path.includes("page=2")) {
        return new Promise((resolve) => {
          releaseNext = resolve;
        });
      }
      return pageResponse(1);
    });

    render(
      <ResourceProvider defaults={{ freshFor: 30_000, retries: false }}>
        <LibraryController>
          <Probe />
        </LibraryController>
      </ResourceProvider>,
    );
    await screen.findByText("entry-1");

    act(() => latest.setPage(2));

    await waitFor(() =>
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      ),
    );
    expect(screen.getByText("entry-1")).toBeInTheDocument();
    expect(screen.queryByText("skeleton")).not.toBeInTheDocument();

    await act(async () => releaseNext(pageResponse(2)));
    await screen.findByText("entry-2");
  });
});
