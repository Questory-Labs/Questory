import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { Collection, TasteClusterPreview } from "@questorylabs/shared";
import { CollectionsView } from "./steam.collections.view";
import type { CollectionsViewProps } from "./steam.collections.types";

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

const idleCreate = {
  submit: vi.fn(),
  submitAsync: vi.fn(),
  reset: vi.fn(),
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as unknown as UseActionResult<unknown, void>;

const collections: Collection[] = [
  {
    id: "c1",
    name: "Never Played",
    type: "auto",
    ruleKey: "never_played",
    gameCount: 4,
    description: "Games still waiting",
  },
];

const renderView = (patch: Partial<CollectionsViewProps>) =>
  render(
    <CollectionsView
      {...({
        list: resource<Collection[]>({
          empty: false,
          failed: false,
          value: collections,
        }),
        create: idleCreate,
        name: "",
        setName: () => undefined,
        ...patch,
      } as CollectionsViewProps)}
    />,
  );

describe("CollectionsView", () => {
  afterEach(cleanup);

  it("shows skeletons when the list is empty", () => {
    renderView({
      list: resource<Collection[]>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Never Played")).not.toBeInTheDocument();
  });

  it("shows an error when the list failed, even if empty", () => {
    renderView({
      list: resource<Collection[]>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load collections."),
    ).toBeInTheDocument();
  });

  it("renders collections when ready", () => {
    renderView({});
    expect(screen.getByText("Never Played")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no collections", () => {
    renderView({
      list: resource<Collection[]>({ empty: false, failed: false, value: [] }),
    });
    expect(screen.getByText("No collections yet.")).toBeInTheDocument();
  });

  it("offers taste grouping only when QEngine is available", () => {
    const groupByTaste = {
      ...idleCreate,
      succeeded: true,
      value: { available: true, collections: 2 },
    } as unknown as CollectionsViewProps["groupByTaste"];
    renderView({ tasteAvailable: false, groupByTaste });
    expect(screen.queryByRole("button", { name: "Group by taste" })).toBeNull();
    cleanup();
    renderView({ tasteAvailable: true, groupByTaste });
    expect(screen.getByRole("button", { name: "Group by taste" })).toBeInTheDocument();
    expect(screen.getByText("2 taste shelves updated.")).toBeInTheDocument();
  });

  it("shows a mutation error when create failed", () => {
    renderView({
      create: { ...idleCreate, failed: true },
    });
    expect(
      screen.getByText("Could not create collection."),
    ).toBeInTheDocument();
  });

  it("splits smart shelves, taste groups and custom lists with labels", () => {
    const { container } = renderView({
      list: resource<Collection[]>({
        empty: false,
        failed: false,
        value: [
          { ...collections[0], covers: ["https://img/a.jpg", "https://img/b.jpg"] },
          { id: "c2", name: "Cozy", type: "auto", ruleKey: "cluster:7", gameCount: 3 },
          {
            id: "c3",
            name: "Couch",
            type: "custom",
            ruleKey: null,
            gameCount: 2,
            color: "#5fd38a",
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
        ],
      }),
    });
    expect(screen.getByText("Smart shelf")).toBeInTheDocument();
    expect(screen.getByText("Taste group")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Couch" })).toHaveAttribute("href", "/collections/c3");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(container.querySelector('[style*="rgb(95, 211, 138)"]')).not.toBeNull();
  });

  it("previews taste groups and saves one", () => {
    const submit = vi.fn();
    const preview: TasteClusterPreview = {
      available: true,
      clusters: [
        { id: "7", name: "Cozy sims", gameCount: 5, saved: false },
        { id: "8", name: "Roguelikes", gameCount: 9, saved: true },
      ],
    };
    renderView({
      tasteAvailable: true,
      tastePreview: resource<TasteClusterPreview>({ empty: false, failed: false, value: preview }),
      saveCluster: { ...idleCreate, submit } as unknown as CollectionsViewProps["saveCluster"],
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Cozy sims" }));
    expect(submit).toHaveBeenCalledWith("7");
    expect(screen.getByRole("button", { name: "Roguelikes saved" })).toBeDisabled();
  });
});
