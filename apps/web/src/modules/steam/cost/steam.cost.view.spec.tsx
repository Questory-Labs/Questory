import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { CostRoiPage, CostSummary } from "@questorylabs/shared";
import { CostView } from "./steam.cost.view";
import type { CostViewProps, ValueTab } from "./steam.cost.types";

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
  playtimeBuckets: [],
  libraryMix: { paid: { count: 0, amount: 0 }, free: { count: 0 } },
  shelfware: [],
  byGenre: [],
  byPublisher: [],
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
        bestRoi: readyRoi(),
        worstRoi: readyRoi(),
        bestTab: "paid" as ValueTab,
        setBestTab: () => undefined,
        worstTab: "paid" as ValueTab,
        setWorstTab: () => undefined,
        bestPage: 1,
        setBestPage: () => undefined,
        worstPage: 1,
        setWorstPage: () => undefined,
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
    expect(screen.queryByText("Library value")).not.toBeInTheDocument();
    expect(screen.queryByText("By genre")).not.toBeInTheDocument();
  });

  it("shows an error when summary failed", () => {
    renderView({
      summary: resource<CostSummary>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load cost summary.")).toBeInTheDocument();
    expect(screen.queryByText("Library value")).not.toBeInTheDocument();
  });

  it("renders summary stats when ready", () => {
    renderView({});
    expect(screen.getByText("Library value")).toBeInTheDocument();
    expect(screen.getByText("8 / 2")).toBeInTheDocument();
    expect(screen.queryByText("Could not load cost summary.")).not.toBeInTheDocument();
    expect(screen.getAllByText("Price data will appear after the next store sync.")).toHaveLength(2);
  });

  it("shows list skeletons when best ROI is empty", () => {
    const { container } = renderView({
      bestRoi: resource<CostRoiPage>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Loading rankings…")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
    expect(
      screen.queryByText("Could not load best value rankings."),
    ).not.toBeInTheDocument();
  });

  it("shows an error when best ROI failed", () => {
    renderView({
      bestRoi: resource<CostRoiPage>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load best value rankings."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading rankings…")).not.toBeInTheDocument();
  });
});
