import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { StoreAccountStatus, User } from "@questorylabs/shared";
import { ConnectionsView } from "./steam.settings-connections.view";
import type { ConnectionsViewProps } from "./steam.settings-connections.types";

vi.mock("@/components/SteamSyncStatus", () => ({
  SteamSyncStatus: () => <div>sync-status</div>,
}));

vi.mock("@/lib/auth-api", () => ({
  steamLinkUrl: () => "/auth/steam",
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

const user: User = {
  id: "u1",
  steamId: "765",
  personaName: "Sam",
  avatarUrl: null,
  profileUrl: null,
};

const steamStatus: StoreAccountStatus = {
  store: "steam",
  connected: true,
  syncEnabled: true,
  status: "connected",
  displayName: "Sam",
};

const idleSync = {
  active: false,
  current: null,
  doneCount: 0,
  total: 0,
} as ConnectionsViewProps["sync"];

const renderView = (patch: Partial<ConnectionsViewProps>) =>
  render(
    <ConnectionsView
      {...({
        justLinked: false,
        linkError: null,
        stores: resource<StoreAccountStatus[]>({
          empty: false,
          failed: false,
          value: [steamStatus],
        }),
        sync: idleSync,
        user,
        steamConnected: false,
        steamStatus,
        showMusic: false,
        showWatch: false,
        showRead: false,
        ...patch,
      } as ConnectionsViewProps)}
    />,
  );

describe("ConnectionsView", () => {
  afterEach(cleanup);

  it("shows a link button when Steam is not connected", () => {
    renderView({});
    expect(screen.getByRole("button", { name: "Link Steam" })).toBeInTheDocument();
    expect(screen.queryByText("Could not load store status.")).not.toBeInTheDocument();
  });

  it("shows skeletons for store status when Steam is linked and stores are empty", () => {
    renderView({
      steamConnected: true,
      stores: resource<StoreAccountStatus[]>({ empty: true, failed: false }),
    });
    expect(screen.queryByText(/Linked ·/)).not.toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows an error when stores failed, even if empty", () => {
    renderView({
      steamConnected: true,
      stores: resource<StoreAccountStatus[]>({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load store status.")).toBeInTheDocument();
  });

  it("renders linked Steam details when ready", () => {
    renderView({ steamConnected: true });
    expect(screen.getByText(/Linked · 765 · Sam/)).toBeInTheDocument();
  });
});
