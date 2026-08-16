import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReadTitleDetail } from "@questorylabs/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import ReadTitlePage from "./page";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

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

describe("ReadTitlePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(readFetch).mockReset();
    vi.mocked(readFetch).mockResolvedValue(detail);
  });

  it("loads all-time history without a date range picker", async () => {
    wrap(<ReadTitlePage />);

    expect(await screen.findByRole("heading", { name: "Berserk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText(/2 events · first/)).toBeInTheDocument();
    expect(screen.getAllByText(/anilist/).length).toBeGreaterThan(0);

    expect(screen.queryByRole("button", { name: "Day" })).not.toBeInTheDocument();
    expect(readFetch).toHaveBeenCalledWith("/analytics/titles/title-1");
  });
});
