import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminEnrichmentView } from "./admin.enrichment.view";
import type {
  AdminEnrichmentViewProps,
  EnrichmentResponse,
  RequeueInput,
  RequeueResponse,
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

const idleRequeue = {
  ...idleTrigger,
} as unknown as UseActionResult<RequeueResponse, RequeueInput>;

const bucket = (patch?: Partial<StatusBucket>): StatusBucket => ({
  pending: 1,
  running: 0,
  completed: 2,
  failed: 0,
  total: 3,
  completed24h: 1,
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
        requeue: idleRequeue,
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

  it("shows the selected domain's stat tiles", () => {
    renderView({});
    expect(screen.getByText("Completed · 24h")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Domain" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Status filter" })).toBeInTheDocument();
  });

  it("confirms before recovering every failed job", () => {
    const submit = vi.fn();
    renderView({
      data: resource<EnrichmentResponse>({
        empty: false,
        failed: false,
        value: {
          ...dataValue,
          counts: { ...dataValue.counts, music: bucket({ failed: 12 }) },
        },
      }),
      requeue: { ...idleRequeue, submit },
    });
    fireEvent.click(screen.getByRole("button", { name: /Recover 12 failed/ }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Requeue" }));
    expect(submit).toHaveBeenCalledWith({ domain: "music", allFailed: true });
  });

  it("confirms before requeueing a single failed row", () => {
    const submit = vi.fn();
    renderView({
      data: resource<EnrichmentResponse>({
        empty: false,
        failed: false,
        value: {
          ...dataValue,
          items: [
            {
              ...dataValue.items[0],
              status: "failed",
              attempts: 3,
              error: "MusicBrainz 503",
            },
          ],
        },
      }),
      requeue: { ...idleRequeue, submit },
    });
    expect(screen.getAllByText("MusicBrainz 503").length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Requeue Nightcall" }));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Requeue" }));
    expect(submit).toHaveBeenCalledWith({ domain: "music", ids: ["job-1abcdef"] });
  });

  it("hides requeue controls for the game domain", () => {
    renderView({
      domain: "game",
      data: resource<EnrichmentResponse>({
        empty: false,
        failed: false,
        value: {
          ...dataValue,
          counts: { ...dataValue.counts, game: bucket({ failed: 4 }) },
          items: [{ ...dataValue.items[0], status: "failed" }],
        },
      }),
    });
    expect(screen.queryByRole("button", { name: /Recover/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Requeue/ })).not.toBeInTheDocument();
  });

  it("shows the requeue error", () => {
    renderView({
      requeue: { ...idleRequeue, failed: true, error: new Error("requeue down") },
    });
    expect(screen.getByText("requeue down")).toBeInTheDocument();
  });
});
