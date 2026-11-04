import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { NavCounts, StoreAccountStatus } from "@questorylabs/shared";
import { StoresSettingsView } from "./steam.settings-stores.view";
import type { StoresSettingsViewProps } from "./steam.settings-stores.types";

vi.mock("../settings-shared/SyncNowButton", () => ({
  SyncNowButton: () => <button type="button">Sync now</button>,
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

const rows: StoreAccountStatus[] = [
  {
    store: "steam",
    connected: true,
    syncEnabled: true,
    status: "connected",
    displayName: "Sam",
    externalUserId: "76561198000001234",
  },
];

const navCounts: NavCounts = {
  library: 412,
  wishlist: 38,
  musicListens: 0,
  watchTitles: 0,
  readTitles: 0,
  activeGoals: 0,
  connectedSources: 1,
};

const renderView = (patch: Partial<StoresSettingsViewProps>) =>
  render(
    <StoresSettingsView
      {...({
        stores: resource<StoreAccountStatus[]>({
          empty: false,
          failed: false,
          value: rows,
        }),
        navCounts: resource<NavCounts>({
          empty: false,
          failed: false,
          value: navCounts,
        }),
        ...patch,
      } as StoresSettingsViewProps)}
    />,
  );

describe("StoresSettingsView", () => {
  afterEach(cleanup);

  it("shows skeletons when stores are empty", () => {
    renderView({
      stores: resource<StoreAccountStatus[]>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Sync runs automatically")).not.toBeInTheDocument();
  });

  it("shows an error when stores failed, even if empty", () => {
    renderView({
      stores: resource<StoreAccountStatus[]>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load stores.")).toBeInTheDocument();
  });

  it("renders store cards when ready", () => {
    renderView({});
    expect(screen.getByText("Sync runs automatically")).toBeInTheDocument();
  });

  it("renders the Steam hero with settings tabs and counts", () => {
    renderView({});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your stores");
    expect(screen.getByRole("link", { name: "Stores" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Connected · Sam · SteamID 7656••••••••1234")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
  });

  it("falls back to default store rows when ready with an empty list", () => {
    renderView({
      stores: resource<StoreAccountStatus[]>({
        empty: false,
        failed: false,
        value: [],
      }),
    });
    expect(screen.getByRole("heading", { name: "Epic Games" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GOG" })).toBeInTheDocument();
  });
});
