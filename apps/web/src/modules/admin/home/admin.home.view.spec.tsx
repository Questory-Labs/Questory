import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminHomeView } from "./admin.home.view";
import type { AdminHomeViewProps, Overview } from "./admin.home.types";

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

const overviewValue: Overview = {
  users: { total: 12, admins: 2 },
  signup: { open: true, enabledSetting: true },
  syncJobs: { pending: 0, running: 1, failed: 3 },
  enrichment: { musicPending: 4, watchPending: 5, importsActive: 0 },
  music: { ok: true },
  watch: { ok: false },
  abuse: { login: 1 },
  recentCronRuns: [
    {
      id: "r1",
      jobName: "daily-refresh",
      status: "ok",
      startedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const renderView = (patch: Partial<AdminHomeViewProps>) =>
  render(
    <AdminHomeView
      {...({
        overview: resource<Overview>({
          empty: false,
          failed: false,
          value: overviewValue,
        }),
        ...patch,
      } as AdminHomeViewProps)}
    />,
  );

describe("AdminHomeView", () => {
  afterEach(cleanup);

  it("shows skeletons when overview is empty", () => {
    renderView({
      overview: resource<Overview>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("shows an error when overview failed, even if empty", () => {
    renderView({
      overview: resource<Overview>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView({});
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("daily-refresh")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no cron runs", () => {
    renderView({
      overview: resource<Overview>({
        empty: false,
        failed: false,
        value: { ...overviewValue, recentCronRuns: [] },
      }),
    });
    expect(screen.getByText("No runs yet.")).toBeInTheDocument();
  });
});
