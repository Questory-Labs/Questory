import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  ScraperProviderDetail,
  ScraperProviderSummary,
} from "@questorylabs/shared";
import { AdminScrapersView } from "./admin.scrapers.view";
import type { AdminScrapersViewProps } from "./admin.scrapers.types";

vi.mock("./components/ScraperIterationList", () => ({
  ScraperIterationList: () => <div>iteration list</div>,
}));

vi.mock("./components/ScraperIterationWorkflow", () => ({
  ScraperIterationWorkflow: () => <div>workflow</div>,
}));

vi.mock("./components/ScraperTestPanel", () => ({
  ScraperTestPanel: () => <div>test panel</div>,
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

const idleToggle = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as UseActionResult<ScraperProviderDetail, boolean>;

const summary: ScraperProviderSummary = {
  key: "letterboxd",
  label: "Letterboxd",
  description: "Diary scraper",
  enabled: true,
  hasPublished: true,
  hasOpenIteration: false,
};

const detailValue: ScraperProviderDetail = {
  ...summary,
  current: null,
  previous: [],
  openIteration: null,
};

const renderView = (patch: Partial<AdminScrapersViewProps>) =>
  render(
    <AdminScrapersView
      {...({
        providerKey: "letterboxd",
        setProviderKey: () => undefined,
        viewIterationId: null,
        setViewIterationId: () => undefined,
        providers: resource<ScraperProviderSummary[]>({
          empty: false,
          failed: false,
          value: [summary],
        }),
        detail: resource<ScraperProviderDetail>({
          empty: false,
          failed: false,
          value: detailValue,
        }),
        toggleEnabled: idleToggle,
        viewing: null,
        viewingReadOnly: false,
        ...patch,
      } as AdminScrapersViewProps)}
    />,
  );

describe("AdminScrapersView", () => {
  afterEach(cleanup);

  it("shows skeletons when providers are empty", () => {
    renderView({
      providers: resource<ScraperProviderSummary[]>({
        empty: true,
        failed: false,
      }),
      detail: resource<ScraperProviderDetail>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Letterboxd")).not.toBeInTheDocument();
  });

  it("shows an error when providers failed, even if empty", () => {
    renderView({
      providers: resource<ScraperProviderSummary[]>({
        empty: true,
        failed: true,
      }),
      detail: resource<ScraperProviderDetail>({ empty: true, failed: false }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Letterboxd")).not.toBeInTheDocument();
  });

  it("renders providers when ready", () => {
    renderView({});
    expect(screen.getAllByText("Letterboxd").length).toBeGreaterThan(0);
    expect(screen.getByText("iteration list")).toBeInTheDocument();
  });

  it("shows StateMessage loading when detail is empty", () => {
    renderView({
      detail: resource<ScraperProviderDetail>({ empty: true, failed: false }),
    });
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("shows an error when detail failed, even if empty", () => {
    renderView({
      detail: resource<ScraperProviderDetail>({
        empty: true,
        failed: true,
        error: new Error("detail down"),
      }),
    });
    expect(screen.getByText("detail down")).toBeInTheDocument();
    expect(screen.queryByText("Select a provider.")).not.toBeInTheDocument();
  });

  it("shows select a provider when detail is ready without a value", () => {
    renderView({
      detail: resource<ScraperProviderDetail>({
        empty: false,
        failed: false,
        value: undefined,
      }),
    });
    expect(screen.getByText("Select a provider.")).toBeInTheDocument();
  });
});
