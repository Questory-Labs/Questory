import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("2h · Puzzle")).toBeInTheDocument();
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
