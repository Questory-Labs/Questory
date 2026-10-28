import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  MusicPlayingNow,
  MusicRecentPage,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listenDayKey } from "@/lib/music";
import { mockResource } from "@/test/resource-mock";
import { MusicListeningView } from "./music.listening.view";
import type { MusicListeningViewProps } from "./music.listening.types";

const emptyPlaying = mockResource<MusicPlayingNow>({
  empty: false,
  failed: false,
  value: null,
});

const page: MusicRecentPage = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [
    {
      id: "l1",
      listenedAt: "2026-08-01T12:00:00.000Z",
      track: {
        id: "t1",
        title: "Helix",
        artistId: "a1",
        artistName: "Flume",
        releaseId: null,
        releaseTitle: null,
        imageUrl: null,
        genres: [],
      },
    },
  ],
};

const noTotals = mockResource<MusicTimeBucket[]>({
  empty: false,
  failed: false,
  value: [],
});

const renderView = (patch: Partial<MusicListeningViewProps> = {}) => {
  const recent =
    patch.recent ?? mockResource({ empty: false, failed: false, value: page });
  return render(
    <MusicListeningView
      {...({
        recent,
        playing: emptyPlaying,
        page: 1,
        setPage: () => {},
        items: recent.value?.items ?? [],
        query: "",
        setQuery: () => {},
        source: "all",
        setSource: () => {},
        filtered: false,
        dayTotals: noTotals,
        hasOlder: false,
        loadOlder: () => {},
        loadingOlder: false,
        olderFailed: false,
        ...patch,
      } as MusicListeningViewProps)}
    />,
  );
};

describe("MusicListeningView", () => {
  afterEach(cleanup);

  it("shows an error when recent failed", () => {
    renderView({
      recent: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load listens.")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no items", () => {
    renderView({
      recent: mockResource({
        empty: false,
        failed: false,
        value: { total: 0, page: 1, pageSize: 15, items: [] },
      }),
    });
    expect(screen.getByText("No listens yet")).toBeInTheDocument();
  });

  it("renders listens when ready", () => {
    renderView();
    expect(screen.getAllByText("Helix").length).toBeGreaterThan(0);
  });
  it("shows day totals with listens and minutes", () => {
    renderView({
      dayTotals: mockResource<MusicTimeBucket[]>({
        empty: false,
        failed: false,
        value: [
          {
            key: listenDayKey(page.items[0].listenedAt),
            label: "Aug 1",
            count: 62,
            minutes: 230,
          },
        ],
      }),
    });
    expect(screen.getByText("62 listens · 3h 50m")).toBeInTheDocument();
    expect(screen.getByText("1 scrobbles")).toBeInTheDocument();
  });

  it("filters by query and source", () => {
    const setQuery = vi.fn();
    const setSource = vi.fn();
    renderView({ setQuery, setSource });
    fireEvent.change(screen.getByLabelText("Filter listens"), {
      target: { value: "hel" },
    });
    expect(setQuery).toHaveBeenCalledWith("hel");
    fireEvent.click(screen.getByRole("button", { name: "Last.fm" }));
    expect(setSource).toHaveBeenCalledWith("lastfm");
    expect(screen.getByRole("button", { name: "All sources" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a matching count and empty state when filtered", () => {
    renderView({ filtered: true });
    expect(screen.getByText("1 matching")).toBeInTheDocument();
    cleanup();
    renderView({
      filtered: true,
      items: [],
      recent: mockResource({
        empty: false,
        failed: false,
        value: { total: 0, page: 1, pageSize: 15, items: [] },
      }),
    });
    expect(screen.getByText("No listens match")).toBeInTheDocument();
  });

  it("loads older listens", () => {
    const loadOlder = vi.fn();
    renderView({ hasOlder: true, loadOlder });
    fireEvent.click(screen.getByRole("button", { name: "Load older listens" }));
    expect(loadOlder).toHaveBeenCalled();
  });

  it("reports a failed older load", () => {
    renderView({ hasOlder: true, olderFailed: true });
    expect(screen.getByText("Could not load older listens.")).toBeInTheDocument();
  });
});
