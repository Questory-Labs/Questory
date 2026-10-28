import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("shows deal cut, why and best price columns", () => {
    const startEdit = vi.fn();
    const rich: WishlistItem = {
      ...item,
      discountPercent: 60,
      regularPrice: 25,
      bestPrice: 8,
      bestStore: "gog",
      reasons: ["Near historical low", "On wishlist a while", "Genre fit"],
    };
    renderView({
      list: resource<WishlistResponse>({
        empty: false,
        failed: false,
        value: { ...listValue, items: [rich] },
      }),
      startEdit,
    });
    expect(screen.getByText("−60%")).toBeInTheDocument();
    expect(screen.getByText("Near historical low · On wishlist a while")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("GOG")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit price target for Team Fortress 2" }));
    expect(startEdit).toHaveBeenCalledWith("steam:440", "5");
  });

  it("renders deal alert cards with the cut and reason", () => {
    const deal: DealAlert = {
      store: "steam",
      externalId: "440",
      appId: 440,
      name: "Deal Game",
      headerImage: null,
      currentPrice: 4,
      lowestPrice: 4,
      targetPrice: 5,
      shouldBuyScore: 80,
      discountPercent: 75,
      reason: "target",
    };
    renderView({ filteredDeals: [deal] });
    expect(screen.getByText("Deal Game")).toBeInTheDocument();
    expect(screen.getByText("−75%")).toBeInTheDocument();
    expect(screen.getByText(/Target hit · target/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 wishes, 1 deal alerts");
  });
});
