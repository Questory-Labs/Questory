import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminEnrichmentView } from "./admin.enrichment.view";
import type {
  AdminEnrichmentViewProps,
  EnrichmentResponse,
  StatusBucket,
} from "./admin.enrichment.types";

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

const idleTrigger = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as UseActionResult<unknown, void>;

const bucket = (patch?: Partial<StatusBucket>): StatusBucket => ({
  pending: 1,
  running: 0,
  completed: 2,
  failed: 0,
  total: 3,
  ...patch,
});

const dataValue: EnrichmentResponse = {
  domain: "music",
  page: 1,
  pageSize: 15,
  total: 1,
  counts: {
    music: bucket(),
    watch: bucket({ pending: 0, total: 2 }),
    game: bucket({ pending: 0, running: 0, total: 2 }),
  },
  items: [
    {
      id: "job-1abcdef",
      refId: "ref-1abc",
      label: "Nightcall",
      detail: "Kavinsky",
      status: "pending",
      attempts: 0,
      error: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    },
  ],
};

const renderView = (patch: Partial<AdminEnrichmentViewProps>) =>
  render(
    <AdminEnrichmentView
      {...({
        domain: "music",
        setDomain: () => undefined,
        status: "all",
        setStatus: () => undefined,
        page: 1,
        setPage: () => undefined,
        data: resource<EnrichmentResponse>({
          empty: false,
          failed: false,
          value: dataValue,
        }),
        trigger: idleTrigger,
        ...patch,
      } as AdminEnrichmentViewProps)}
    />,
  );

describe("AdminEnrichmentView", () => {
  afterEach(cleanup);

  it("shows skeletons when jobs are empty", () => {
    renderView({
      data: resource<EnrichmentResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Nightcall")).not.toBeInTheDocument();
    expect(screen.queryByText("No jobs in this view")).not.toBeInTheDocument();
  });

  it("shows an error when jobs failed, even if empty", () => {
    renderView({
      data: resource<EnrichmentResponse>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Nightcall")).not.toBeInTheDocument();
  });

  it("renders jobs when ready", () => {
    renderView({});
    expect(screen.getByText("Nightcall")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no jobs", () => {
    renderView({
      data: resource<EnrichmentResponse>({
        empty: false,
        failed: false,
        value: { ...dataValue, items: [], total: 0 },
      }),
    });
    expect(screen.getByText("No jobs in this view")).toBeInTheDocument();
  });

  it("keeps the trigger failed message", () => {
    renderView({
      trigger: {
        ...idleTrigger,
        failed: true,
        error: new Error("recover failed"),
      },
    });
    expect(screen.getByText("recover failed")).toBeInTheDocument();
  });
});
