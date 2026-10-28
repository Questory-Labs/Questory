import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { LibraryEntry } from "@questorylabs/shared";
import { LibraryView } from "./steam.library.view";
import type { LibraryListResponse, LibraryViewProps } from "./steam.library.types";

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const idleSync = {
  active: false,
  current: null,
  doneCount: 0,
  total: 0,
} as LibraryViewProps["sync"];

const portal: LibraryEntry = {
  id: "entry-1",
  playtimeForever: 120,
  stores: ["steam"],
  game: {
    id: "game-1",
    appId: 400,
    name: "Portal",
    headerImage: null,
    genres: ["Puzzle"],
    categories: [],
    tags: [],
    developers: [],
    publishers: [],
  },
};

const listValue: LibraryListResponse = {
  total: 1,
  page: 1,
  pageSize: 48,
  currency: "USD",
  facets: {
    all: 12,
    neverPlayed: 3,
    playing: 2,
    backlog: 4,
    finished: 1,
    dropped: 0,
  },
  items: [portal],
};

const noop = () => undefined;

const renderView = (patch: Partial<LibraryViewProps>) =>
  render(
    <LibraryView
      {...({
        library: resource<LibraryListResponse>({
          empty: false,
          failed: false,
          value: listValue,
        }),
        sync: idleSync,
        activeStore: "all",
        setStore: noop,
        q: "",
        setQ: noop,
        genre: "",
        setGenre: noop,
        unplayed: false,
        setUnplayed: noop,
        multiplayer: false,
        setMultiplayer: noop,
        deck: false,
        setDeck: noop,
        page: 1,
        setPage: noop,
        status: "all",
        setStatus: noop,
        sort: "lastPlayed",
        setSort: noop,
        layout: "grid",
        setLayout: noop,
        ...patch,
      } as LibraryViewProps)}
    />,
  );

describe("LibraryView", () => {
  afterEach(cleanup);

  it("shows skeletons when the library is empty", () => {
    renderView({
      library: resource<LibraryListResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Portal")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Loading content")).toBeInTheDocument();
  });

  it("shows an error when the library failed", () => {
    renderView({
      library: resource<LibraryListResponse>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load library.")).toBeInTheDocument();
  });

  it("renders games when ready", () => {
    renderView({});
    expect(screen.getByText("Portal")).toBeInTheDocument();
    expect(screen.getByText("Puzzle")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "12 games, 3 untouched",
    );
  });

  it("shows status, value per hour and achievements on cards", () => {
    renderView({
      library: resource<LibraryListResponse>({
        empty: false,
        failed: false,
        value: {
          ...listValue,
          items: [
            {
              ...portal,
              userStatus: "playing",
              costPerHour: 2.5,
              valueAmount: 5,
              achievementPct: 40,
              achievementTotal: 10,
            },
          ],
        },
      }),
    });
    expect(screen.getAllByText("Playing").length).toBeGreaterThan(0);
    expect(screen.getByText("$2.5 / h")).toBeInTheDocument();
    expect(screen.getByText("40% achievements")).toBeInTheDocument();
  });

  it("shows status chips with facet counts and reports picks", () => {
    const setStatus = vi.fn();
    const setPage = vi.fn();
    renderView({ setStatus, setPage });
    const chip = screen.getByRole("button", { name: /4\s*Backlog/ });
    fireEvent.click(chip);
    expect(setStatus).toHaveBeenCalledWith("backlog");
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("changes sort through the select", () => {
    const setSort = vi.fn();
    renderView({ setSort });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "valuePerHour" },
    });
    expect(setSort).toHaveBeenCalledWith("valuePerHour");
  });

  it("renders a table layout", () => {
    renderView({ layout: "table" });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portal" })).toHaveAttribute(
      "href",
      "/library/game-1",
    );
  });

  it("shows collection empty when ready with no items", () => {
    renderView({
      library: resource<LibraryListResponse>({
        empty: false,
        failed: false,
        value: { ...listValue, items: [], total: 0 },
      }),
    });
    expect(
      screen.getByText("No games match these filters."),
    ).toBeInTheDocument();
  });
});
