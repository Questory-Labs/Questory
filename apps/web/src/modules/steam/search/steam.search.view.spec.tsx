import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { SearchResult } from "@questorylabs/shared";
import { SearchView } from "./steam.search.view";
import type { SearchViewProps } from "./steam.search.types";
import type { SemanticSearchResult } from "@/lib/enterprise-api";

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

  it("renders script-looking queries as text", () => {
    const q = "<img onerror=alert(1)>";
    const { container } = renderView({
      q,
      chips: [],
      result: resource<SearchResult>({
        empty: false,
        failed: false,
        value: emptyResult,
      }),
    });
    expect(screen.getByText(`Results for “${q}”`)).toBeInTheDocument();
    expect(container.querySelector("img[onerror]")).toBeNull();
  });

  it("renders meaning results with domain links and the mode toggle", () => {
    renderView({
      mode: "meaning",
      meaningAvailable: true,
      meaning: resource<SemanticSearchResult>({
        empty: false,
        failed: false,
        value: {
          available: true,
          items: [
            { key: "game:g1", id: "g1", domain: "games", kind: "game", name: "Stardew Valley", score: 0.71 },
            { key: "read:r1", id: "r1", domain: "read", kind: "manga", name: "Yotsuba", year: 2003, score: 0.6 },
          ],
        },
      }),
    });
    expect(screen.getByRole("link", { name: /Stardew Valley/ })).toHaveAttribute("href", "/library/g1");
    expect(screen.getByRole("link", { name: /Yotsuba/ })).toHaveAttribute("href", "/read/titles/r1");
    expect(screen.getByText("Read · 2003")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "By meaning" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("No results found.")).toBeNull();
  });

  it("explains when meaning search is not ready", () => {
    renderView({
      mode: "meaning",
      meaningAvailable: true,
      meaning: resource<SemanticSearchResult>({
        empty: false,
        failed: false,
        value: { available: false, items: [] },
      }),
    });
    expect(screen.getByText(/warming up/)).toBeInTheDocument();
  });

  it("hides the mode toggle without enterprise", () => {
    renderView({});
    expect(screen.queryByRole("link", { name: "By meaning" })).toBeNull();
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

  it("shows playtime, status and last played on game hits", () => {
    renderView({
      result: resource<SearchResult>({
        empty: false,
        failed: false,
        value: {
          ...emptyResult,
          games: [
            {
              appId: 570,
              gameId: "g1",
              name: "Dota 2",
              headerImage: null,
              source: "library",
              playtimeMinutes: 30,
              userStatus: "playing",
            },
          ],
          developers: ["Valve"],
        },
      }),
    });
    expect(screen.getByText("Playing · 30m total")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dota 2/ })).toHaveAttribute("href", "/library/g1");
    expect(screen.getByText("Valve")).toBeInTheDocument();
    expect(screen.getByText("Developers")).toBeInTheDocument();
  });
});
