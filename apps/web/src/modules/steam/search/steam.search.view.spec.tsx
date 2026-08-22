import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";
import { SearchView } from "./steam.search.view";
import type { SearchViewProps } from "./steam.search.types";

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

const emptyResult: SearchResult = {
  games: [],
  friends: [],
  developers: [],
  publishers: [],
  collections: [],
  music: { artists: [], albums: [], tracks: [] },
  watch: { movies: [], shows: [] },
  read: { titles: [] },
};

const hits: SearchResult = {
  ...emptyResult,
  games: [
    {
      appId: 570,
      gameId: "g1",
      name: "Dota 2",
      headerImage: null,
      source: "library",
    },
  ],
};

const renderView = (patch: Partial<SearchViewProps>) =>
  render(
    <SearchView
      {...({
        q: "dota",
        chips: ["dota"],
        result: resource<SearchResult>({
          empty: false,
          failed: false,
          value: hits,
        }),
        showMusic: false,
        showWatch: false,
        showRead: false,
        ...patch,
      } as SearchViewProps)}
    />,
  );

describe("SearchView", () => {
  afterEach(cleanup);

  it("prompts for a query when q is empty", () => {
    renderView({
      q: "",
      chips: [],
      result: resource<SearchResult>({ empty: true, failed: false }),
    });
    expect(
      screen.getByText(/Use the header search or press Ctrl\+K/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dota 2")).not.toBeInTheDocument();
  });

  it("shows skeletons when searching and the result is empty", () => {
    renderView({
      result: resource<SearchResult>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Dota 2")).not.toBeInTheDocument();
    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
  });

  it("shows an error when search failed, even if empty", () => {
    renderView({
      result: resource<SearchResult>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Search failed. Try again.")).toBeInTheDocument();
  });

  it("renders hits when ready", () => {
    renderView({});
    expect(screen.getByText("Dota 2")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no hits", () => {
    renderView({
      result: resource<SearchResult>({
        empty: false,
        failed: false,
        value: emptyResult,
      }),
    });
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });
});
