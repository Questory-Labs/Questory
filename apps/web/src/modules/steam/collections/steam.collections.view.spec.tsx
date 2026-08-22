import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { Collection } from "@questorylabs/shared";
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

  it("shows a mutation error when create failed", () => {
    renderView({
      create: { ...idleCreate, failed: true },
    });
    expect(
      screen.getByText("Could not create collection."),
    ).toBeInTheDocument();
  });
});
