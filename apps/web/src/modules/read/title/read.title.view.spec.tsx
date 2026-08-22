import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReadTitleDetail } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { ReadTitleView } from "./read.title.view";
import type { ReadTitleViewProps } from "./read.title.types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "title-1" }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ tags: [] }),
}));

vi.mock("@/lib/read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/read")>();
  return { ...actual, readFetch: vi.fn() };
});

import { readFetch } from "@/lib/read";
import { ReadTitleController } from "./read.title.controller";

const detail: ReadTitleDetail = {
  range: "all",
  title: {
    id: "title-1",
    name: "Berserk",
    displayName: null,
    format: "manga",
    year: 1989,
    overview: "A dark fantasy.",
    coverUrl: null,
    genres: ["Action"],
  },
  listStatus: "reading",
  eventCount: 2,
  firstReadAt: "2026-01-02T20:00:00.000Z",
  latestReadAt: "2026-08-01T20:00:00.000Z",
  recentEvents: [
    {
      id: "e2",
      readAt: "2026-08-01T20:00:00.000Z",
      source: "anilist",
      status: "reading",
      chaptersRead: 12,
      volumesRead: 2,
    },
    {
      id: "e1",
      readAt: "2026-01-02T20:00:00.000Z",
      source: "anilist",
      status: "reading",
      chaptersRead: 1,
      volumesRead: 1,
    },
  ],
};

const wrap = (ui: React.ReactNode) => {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
};

const renderView = (patch: Partial<ReadTitleViewProps> = {}) =>
  wrap(
    <ReadTitleView
      {...({
        id: "title-1",
        detail: mockResource({ empty: false, failed: false, value: detail }),
        saveBusy: false,
        onSave: async () => {},
        ...patch,
      } as ReadTitleViewProps)}
    />,
  );

describe("ReadTitleView", () => {
  afterEach(cleanup);

  it("shows an error when the title failed", () => {
    renderView({
      detail: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Title not found.")).toBeInTheDocument();
  });

  it("renders history when ready", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Berserk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText(/2 events · first/)).toBeInTheDocument();
    expect(screen.getAllByText(/anilist/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Day" })).not.toBeInTheDocument();
  });
});

describe("ReadTitleController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(readFetch).mockReset();
    vi.mocked(readFetch).mockResolvedValue(detail);
  });

  it("loads all-time history without a date range picker", async () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <ReadTitleController>
          <ReadTitleView />
        </ReadTitleController>
      </ResourceProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Berserk" })).toBeInTheDocument();
    expect(readFetch).toHaveBeenCalledWith("/analytics/titles/title-1");
  });
});
