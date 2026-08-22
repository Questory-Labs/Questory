import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { DealAlert, WishlistItem } from "@questorylabs/shared";
import { WishlistView } from "./steam.wishlist.view";
import type {
  Recommendation,
  WishlistResponse,
  WishlistViewProps,
} from "./steam.wishlist.types";

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    user: { steamId: "1", personaName: "Sam", currency: "USD" },
  }),
}));

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

const item: WishlistItem = {
  id: "w1",
  store: "steam",
  externalId: "440",
  appId: 440,
  gameId: null,
  name: "Team Fortress 2",
  headerImage: null,
  priority: 0,
  dateAdded: null,
  targetPrice: 5,
  currentPrice: 10,
  lowestPrice: 3,
  shouldBuyScore: 72,
  genres: [],
};

const listValue: WishlistResponse = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [item],
};

const idleUpdate = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as WishlistViewProps["update"];

const renderView = (patch: Partial<WishlistViewProps>) =>
  render(
    <WishlistView
      {...({
        storeFilter: "all",
        setStoreFilter: () => undefined,
        page: 1,
        setPage: () => undefined,
        list: resource<WishlistResponse>({
          empty: false,
          failed: false,
          value: listValue,
        }),
        recommendations: resource<Recommendation[]>({
          empty: false,
          failed: false,
          value: [],
        }),
        deals: resource<DealAlert[]>({
          empty: false,
          failed: false,
          value: [],
        }),
        update: idleUpdate,
        editing: null,
        target: "",
        setTarget: () => undefined,
        startEdit: () => undefined,
        stopEdit: () => undefined,
        filteredRecs: [],
        filteredDeals: [],
        ...patch,
      } as WishlistViewProps)}
    />,
  );

describe("WishlistView", () => {
  afterEach(cleanup);

  it("shows skeletons when the list is empty", () => {
    renderView({
      list: resource<WishlistResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Team Fortress 2")).not.toBeInTheDocument();
  });

  it("shows an error when the list failed", () => {
    renderView({
      list: resource<WishlistResponse>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load wishlist.")).toBeInTheDocument();
  });

  it("renders wishlist items when ready", () => {
    renderView({});
    expect(screen.getByText("Team Fortress 2")).toBeInTheDocument();
  });
});
