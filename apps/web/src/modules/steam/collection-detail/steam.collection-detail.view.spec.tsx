import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { CollectionDetailView } from "./steam.collection-detail.view";
import type {
  CollectionDetailResponse,
  CollectionDetailViewProps,
} from "./steam.collection-detail.types";

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

const detailValue: CollectionDetailResponse = {
  name: "Never Played",
  description: "Games still waiting",
  type: "auto",
  total: 1,
  page: 1,
  pageSize: 15,
  games: [
    {
      appId: 570,
      name: "Dota 2",
      headerImage: null,
      genres: ["Action", "Strategy"],
    },
  ],
};

const renderView = (patch: Partial<CollectionDetailViewProps>) =>
  render(
    <CollectionDetailView
      {...({
        collection: resource<CollectionDetailResponse>({
          empty: false,
          failed: false,
          value: detailValue,
        }),
        page: 1,
        setPage: () => undefined,
        ...patch,
      } as CollectionDetailViewProps)}
    />,
  );

describe("CollectionDetailView", () => {
  afterEach(cleanup);

  it("shows skeletons when the collection is empty", () => {
    renderView({
      collection: resource<CollectionDetailResponse>({
        empty: true,
        failed: false,
      }),
    });
    expect(screen.queryByText("Dota 2")).not.toBeInTheDocument();
  });

  it("shows an error when the collection failed, even if empty", () => {
    renderView({
      collection: resource<CollectionDetailResponse>({
        empty: true,
        failed: true,
      }),
    });
    expect(screen.getByText("Could not load collection.")).toBeInTheDocument();
  });

  it("renders games when ready", () => {
    renderView({});
    expect(screen.getByText("Dota 2")).toBeInTheDocument();
    expect(screen.getByText("Never Played")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no games", () => {
    renderView({
      collection: resource<CollectionDetailResponse>({
        empty: false,
        failed: false,
        value: { ...detailValue, games: [], total: 0 },
      }),
    });
    expect(
      screen.getByText("No games in this collection."),
    ).toBeInTheDocument();
  });
});
