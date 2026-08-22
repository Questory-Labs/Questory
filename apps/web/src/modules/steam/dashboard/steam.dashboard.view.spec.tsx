import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { DashboardStats, PlayNextItem } from "@questorylabs/shared";
import { DashboardView } from "./steam.dashboard.view";
import type { DashboardViewProps } from "./steam.dashboard.types";

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    user: { steamId: "1", personaName: "Sam" },
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

const idleSync = {
  active: false,
  current: null,
  doneCount: 0,
  total: 0,
} as DashboardViewProps["sync"];

const statsValue: DashboardStats = {
  librarySize: 10,
  totalPlaytimeHours: 12,
  unplayedCount: 2,
  wishlistCount: 3,
  activeFriends: 4,
  costPerHour: null,
  lifetimeAtCurrent: null,
  currency: "USD",
  nearCompletionCount: 1,
  currentSalesCount: 0,
  recentlyPlayed: [],
};

const renderView = (patch: Partial<DashboardViewProps>) =>
  render(
    <DashboardView
      {...({
        recentlyPlayed: [],
        nextUp: [],
        stats: resource<DashboardStats>({ empty: false, failed: false, value: statsValue }),
        playNext: resource<PlayNextItem[]>({ empty: false, failed: false, value: [] }),
        sync: idleSync,
        ...patch,
      } as DashboardViewProps)}
    />,
  );

describe("DashboardView", () => {
  afterEach(cleanup);

  it("shows skeletons when stats are empty", () => {
    renderView({
      stats: resource<DashboardStats>({ empty: true, failed: false }),
      playNext: resource<PlayNextItem[]>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Library")).not.toBeInTheDocument();
  });

  it("shows an error when stats failed", () => {
    renderView({
      stats: resource<DashboardStats>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load dashboard stats."),
    ).toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView({});
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
