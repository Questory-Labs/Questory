import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { StoreAccountStatus } from "@questorylabs/shared";
import { StoresSettingsView } from "./steam.settings-stores.view";
import type { StoresSettingsViewProps } from "./steam.settings-stores.types";

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
  },
];

const renderView = (patch: Partial<StoresSettingsViewProps>) =>
  render(
    <StoresSettingsView
      {...({
        stores: resource<StoreAccountStatus[]>({
          empty: false,
          failed: false,
          value: rows,
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
