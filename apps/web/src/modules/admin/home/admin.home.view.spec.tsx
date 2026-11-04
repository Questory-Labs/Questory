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
  version: "0.0.1",
  uptimeSeconds: 3 * 86400,
  users: { total: 12, admins: 2 },
  signup: { open: true, enabledSetting: true },
  syncJobs: { pending: 0, running: 1, failed: 3 },
  enrichment: { musicPending: 4, watchPending: 5, importsActive: 0 },
  music: { ok: true, status: "up" },
  watch: { ok: false, status: "unavailable" },
  abuse: { rateLimited: 7, loginLockout: 0 },
  recentCronRuns: [
    {
      id: "r1",
      jobName: "daily-refresh",
      status: "completed",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:00:41.000Z",
      error: null,
    },
    {
      id: "r2",
      jobName: "price-sync",
      status: "failed",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:01:00.000Z",
      error: "boom",
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

  it("renders the eyebrow, stats and recent jobs when ready", () => {
    renderView({});
    expect(screen.getByText("Instance · v0.0.1 · up 3 days")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Music service")).toBeInTheDocument();
    expect(screen.getByText("Up")).toBeInTheDocument();
    expect(screen.getByText("Down")).toBeInTheDocument();
    expect(screen.getByText("daily-refresh")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All jobs" })).toHaveAttribute("href", "/admin/jobs");
    expect(screen.getByText("Rate-limited requests")).toBeInTheDocument();
  });

  it("lists real attention items", () => {
    renderView({});
    expect(screen.getByText("three things need you")).toBeInTheDocument();
    expect(screen.getByText("Watch service is unavailable")).toBeInTheDocument();
    expect(screen.getByText("3 sync jobs have failed")).toBeInTheDocument();
    expect(screen.getByText(/price-sync failed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open users" })).toHaveAttribute("href", "/admin/users");
  });

  it("hides attention when everything is healthy", () => {
    renderView({
      overview: resource<Overview>({
        empty: false,
        failed: false,
        value: {
          ...overviewValue,
          watch: { ok: false, status: "disabled" },
          syncJobs: { pending: 0, running: 0, failed: 0 },
          recentCronRuns: [],
        },
      }),
    });
    expect(screen.getByText("all quiet")).toBeInTheDocument();
    expect(screen.queryByText("Needs attention")).toBeNull();
    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(screen.getByText("No runs yet.")).toBeInTheDocument();
  });
});
