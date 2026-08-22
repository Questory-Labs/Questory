import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminCronView } from "./admin.cron.view";
import type {
  AdminCronViewProps,
  CronRunsResponse,
  CronStatus,
} from "./admin.cron.types";

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
} as UseActionResult<unknown, string>;

const statusValue: CronStatus = {
  enabled: true,
  secretConfigured: true,
  jobs: [
    {
      name: "daily-refresh",
      schedule: "0 6 * * *",
      registered: true,
      running: false,
      nextDate: null,
      lastRun: null,
    },
  ],
};

const runsValue: CronRunsResponse = {
  page: 1,
  pageSize: 15,
  total: 1,
  runs: [
    {
      id: "run-12345678",
      jobName: "daily-refresh",
      status: "ok",
      triggeredBy: "admin",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:01:00.000Z",
      error: null,
    },
  ],
};

const renderView = (patch: Partial<AdminCronViewProps>) =>
  render(
    <AdminCronView
      {...({
        page: 1,
        setPage: () => undefined,
        status: resource<CronStatus>({
          empty: false,
          failed: false,
          value: statusValue,
        }),
        runs: resource<CronRunsResponse>({
          empty: false,
          failed: false,
          value: runsValue,
        }),
        trigger: idleTrigger,
        ...patch,
      } as AdminCronViewProps)}
    />,
  );

describe("AdminCronView", () => {
  afterEach(cleanup);

  it("shows skeletons when status is empty", () => {
    renderView({
      status: resource<CronStatus>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("In-process:")).not.toBeInTheDocument();
  });

  it("shows an error when status failed, even if empty", () => {
    renderView({
      status: resource<CronStatus>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("In-process:")).not.toBeInTheDocument();
  });

  it("renders scheduler jobs when status is ready", () => {
    renderView({});
    expect(screen.getAllByText("daily-refresh").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
  });

  it("shows an error when runs failed, even if empty", () => {
    renderView({
      runs: resource<CronRunsResponse>({
        empty: true,
        failed: true,
        error: new Error("runs down"),
      }),
    });
    expect(screen.getByText("runs down")).toBeInTheDocument();
  });

  it("shows skeletons when runs are empty", () => {
    renderView({
      runs: resource<CronRunsResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("No cron runs recorded.")).not.toBeInTheDocument();
    expect(screen.queryByText("admin")).not.toBeInTheDocument();
  });

  it("shows collection empty when runs are ready with no items", () => {
    renderView({
      runs: resource<CronRunsResponse>({
        empty: false,
        failed: false,
        value: { page: 1, pageSize: 15, total: 0, runs: [] },
      }),
    });
    expect(screen.getByText("No cron runs recorded.")).toBeInTheDocument();
  });
});
