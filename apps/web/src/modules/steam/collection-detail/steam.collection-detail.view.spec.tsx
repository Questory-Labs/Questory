import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

const action = () =>
  ({
    submit: vi.fn(),
    submitAsync: vi.fn(),
    reset: vi.fn(),
    busy: false,
    failed: false,
    succeeded: false,
    error: null,
    value: undefined,
    input: undefined,
  }) as unknown as NonNullable<CollectionDetailViewProps["update"]> &
    NonNullable<CollectionDetailViewProps["remove"]> & {
      submit: ReturnType<typeof vi.fn>;
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

  it("hides edit and delete on smart shelves", () => {
    renderView({ update: action(), remove: action(), setEditOpen: vi.fn(), setDeleteOpen: vi.fn() });
    expect(screen.getByText("Smart shelf")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("confirms delete through a dialog before removing", () => {
    const remove = action();
    const setDeleteOpen = vi.fn();
    const custom = resource<CollectionDetailResponse>({
      empty: false,
      failed: false,
      value: { ...detailValue, type: "custom", name: "Couch", color: "#5fd38a" },
    });
    const base = { collection: custom, update: action(), remove, setEditOpen: vi.fn(), setDeleteOpen };
    renderView(base);
    expect(screen.getByText("Custom list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(setDeleteOpen).toHaveBeenCalledWith(true);
    expect(remove.submit).not.toHaveBeenCalled();
    cleanup();
    renderView({ ...base, deleteOpen: true });
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete Couch?");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(remove.submit).toHaveBeenCalled();
  });

  it("saves name, description and color from the edit dialog", () => {
    const update = action();
    renderView({
      collection: resource<CollectionDetailResponse>({
        empty: false,
        failed: false,
        value: { ...detailValue, type: "custom", name: "Couch" },
      }),
      update,
      remove: action(),
      setEditOpen: vi.fn(),
      setDeleteOpen: vi.fn(),
      editOpen: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "Color #5fd38a" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(update.submit).toHaveBeenCalledWith({
      name: "Couch",
      description: "Games still waiting",
      color: "#5fd38a",
    });
  });
});
