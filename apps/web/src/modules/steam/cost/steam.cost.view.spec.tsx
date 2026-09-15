import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  CostRoiPage,
  CostRoiRow,
  CostSummary,
} from "@questorylabs/shared";
import { CostView } from "./steam.cost.view";
import type { CostViewProps } from "./steam.cost.types";

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

const roiRow = (patch: Partial<CostRoiRow> = {}): CostRoiRow => ({
  gameId: "game-1",
  appId: 400,
  name: "Portal",
  headerImage: null,
  stores: ["steam"],
  amount: 10,
  currentPrice: 8,
  lowestPrice: 5,
  hours: 20,
  costPerHour: 0.5,
  priceSource: "store",
  ...patch,
});

const summaryValue: CostSummary = {
  lifetimeSpending: 0,
  lifetimeAtCurrent: 99.5,
  lifetimeAtLowest: 80,
  pricedGameCount: 4,
  librarySize: 10,
  usingStoreEstimates: true,
  currency: "USD",
  costPerHour: 1.5,
  moneyWasted: 12,
  neverPlayedCount: 2,
  underOneHourCount: 1,
  underOneHourValue: 5,
  salePurchaseCount: 0,
  averageDiscount: 0,
  totalHours: 100,
  paidGameCount: 8,
  freeGameCount: 2,
  unplayedValue: 8,
  playtimeBuckets: [{ name: "10–50h", amount: 40, count: 2 }],
  libraryMix: { paid: { count: 8, amount: 99.5 }, free: { count: 2 } },
  shelfware: [
    roiRow({
      gameId: "game-idle",
      name: "Unplayed Epic",
      hours: 0,
      costPerHour: null,
      amount: 8,
    }),
  ],
  byGenre: [{ genre: "Action", amount: 40 }],
  byPublisher: [{ publisher: "Valve", amount: 40 }],
};

const emptyRoiPage: CostRoiPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

const readySummary = () =>
  resource<CostSummary>({ empty: false, failed: false, value: summaryValue });

const readyRoi = (page: CostRoiPage = emptyRoiPage) =>
  resource<CostRoiPage>({ empty: false, failed: false, value: page });

const renderView = (patch: Partial<CostViewProps> = {}) =>
  render(
    <CostView
      {...({
        summary: readySummary(),
        roi: readyRoi(),
        sort: "best",
        setSort: () => undefined,
        valueTab: "paid",
        setValueTab: () => undefined,
        page: 1,
        setPage: () => undefined,
        ...patch,
      } as CostViewProps)}
    />,
  );

describe("CostView", () => {
  afterEach(cleanup);

  it("shows skeletons when summary is empty", () => {
    renderView({
      summary: resource<CostSummary>({ empty: true, failed: false }),
    });
    expect(screen.getByLabelText("Loading stats")).toBeInTheDocument();
    expect(screen.queryByText("Estimated library value")).not.toBeInTheDocument();
    expect(screen.queryByText("Genre")).not.toBeInTheDocument();
  });

  it("shows an error when summary failed", () => {
    renderView({
      summary: resource<CostSummary>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load cost summary.")).toBeInTheDocument();
    expect(screen.queryByText("Estimated library value")).not.toBeInTheDocument();
  });

  it("renders a readable hero and mix instead of jammed ratios", () => {
    renderView({});
    expect(screen.getByText("Estimated library value")).toBeInTheDocument();
    expect(screen.getByText("8 paid")).toBeInTheDocument();
    expect(screen.getByText("2 free")).toBeInTheDocument();
    expect(screen.queryByText("8 / 2")).not.toBeInTheDocument();
    expect(screen.getByText("Unplayed")).toBeInTheDocument();
    expect(screen.getByText("Unplayed Epic")).toBeInTheDocument();
    expect(screen.getByText("Genre")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Value by hours")).toBeInTheDocument();
    expect(screen.getByText("10–50h")).toBeInTheDocument();
    expect(screen.queryByText("Where value sits")).not.toBeInTheDocument();
    expect(
      screen.getByText("Price data will appear after the next store sync."),
    ).toBeInTheDocument();
  });

  it("keeps ranking chrome visible while the list loads", () => {
    const { container } = renderView({
      roi: resource<CostRoiPage>({ empty: true, failed: false }),
    });
    expect(screen.getByRole("tab", { name: "Best value" })).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
    expect(
      screen.queryByText("Could not load value rankings."),
    ).not.toBeInTheDocument();
  });

  it("shows an error when rankings failed", () => {
    renderView({
      roi: resource<CostRoiPage>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load value rankings."),
    ).toBeInTheDocument();
  });

  it("renders ranking rows with playtime and cost per hour", () => {
    renderView({
      roi: readyRoi({
        items: [roiRow()],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    });
    expect(screen.getByRole("link", { name: /Portal/ })).toHaveAttribute(
      "href",
      "/library/game-1",
    );
    expect(screen.getByText(/20h played/)).toBeInTheDocument();
    expect(screen.getByText(/0\.5\/h/)).toBeInTheDocument();
  });

  it("switches ranking order from the sort tabs", () => {
    const setSort = vi.fn();
    renderView({ setSort });
    fireEvent.click(screen.getByRole("tab", { name: "Least value" }));
    expect(setSort).toHaveBeenCalledWith("worst");
  });
});
