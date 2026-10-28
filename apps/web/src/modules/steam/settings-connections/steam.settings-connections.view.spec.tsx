import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  ConnectionsOverview,
  QmonitorDevice,
  QmonitorDeviceList,
  SourcesOverview,
  StoreAccountStatus,
  User,
} from "@questorylabs/shared";
import { ConnectionsView } from "./steam.settings-connections.view";
import type { ConnectionsViewProps } from "./steam.settings-connections.types";

vi.mock("@/components/SteamSyncStatus", () => ({
  SteamSyncStatus: () => <div>sync-status</div>,
}));

vi.mock("../settings-shared/SyncNowButton", () => ({
  SyncNowButton: () => <button type="button">Sync now</button>,
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

const overview: ConnectionsOverview = {
  accounts: [],
  sources: [],
  apiKeys: [],
  qmonitorDeviceCount: 1,
  lastSyncedAt: null,
};

const sourcesOverview: SourcesOverview = {
  connected: 2,
  domains: [
    {
      domain: "music",
      connected: 1,
      providers: [
        { provider: "lastfm", kind: "connection", connected: true, lastSyncedAt: null, lastError: null, account: "sam" },
        { provider: "music_ingest", kind: "api_key", connected: false, lastSyncedAt: null, lastError: null, account: null },
      ],
    },
    {
      domain: "watch",
      connected: 1,
      providers: [
        { provider: "trakt", kind: "connection", connected: true, lastSyncedAt: null, lastError: "auth_failed", account: null },
      ],
    },
    { domain: "read", connected: 0, providers: [] },
  ],
};

const device: QmonitorDevice = {
  id: "d1",
  label: "Desk PC",
  lastUsedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  revokedAt: null,
};

const idleRevoke = {
  submit: vi.fn(),
  submitAsync: vi.fn(),
  reset: vi.fn(),
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as unknown as ConnectionsViewProps["revokeDevice"];

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
        connections: resource<ConnectionsOverview>({
          empty: false,
          failed: false,
          value: overview,
        }),
        sources: resource<SourcesOverview>({
          empty: false,
          failed: false,
          value: sourcesOverview,
        }),
        devices: resource<QmonitorDeviceList>({
          empty: false,
          failed: false,
          value: { devices: [device] },
        }),
        revokeDevice: idleRevoke,
        revokeError: null,
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
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
  });

  it("links Games to stores and counts connected sources in the title", () => {
    renderView({ steamConnected: true });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2 sources, read-only");
    expect(screen.getByRole("link", { name: "Manage Games connections" })).toHaveAttribute(
      "href",
      "/settings/stores",
    );
    expect(screen.getByText("qMonitor · 1 device")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connections" })).toHaveAttribute("aria-current", "page");
  });

  it("shows flag-gated module cards with provider pills and /sources links", () => {
    renderView({ showMusic: true, showWatch: true });
    expect(screen.getByRole("link", { name: "Manage Music connections" })).toHaveAttribute(
      "href",
      "/sources?tab=music",
    );
    expect(screen.getByRole("link", { name: "Manage Watch connections" })).toHaveAttribute(
      "href",
      "/sources?tab=watch",
    );
    expect(screen.queryByRole("link", { name: "Manage Read connections" })).toBeNull();
    expect(screen.getByText("1 of 2 connected")).toBeInTheDocument();
    const lastfm = screen.getByText("Last.fm").closest("li")!;
    expect(within(lastfm).getByText(", connected")).toBeInTheDocument();
    const trakt = screen.getByText("Trakt").closest("li")!;
    expect(within(trakt).getByText(", connection error")).toBeInTheDocument();
    expect(screen.getByText("ListenBrainz ingest").closest("li")).toHaveTextContent("not connected");
  });

  it("confirms before revoking a qMonitor device", () => {
    const submit = vi.fn();
    renderView({ revokeDevice: { ...idleRevoke, submit } as ConnectionsViewProps["revokeDevice"] });
    fireEvent.click(screen.getByRole("button", { name: "Revoke Desk PC" }));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revoke device" }));
    expect(submit).toHaveBeenCalledWith("d1");
  });

  it("shows the link messages", () => {
    renderView({ justLinked: true, linkError: "denied" });
    expect(screen.getByText(/Steam linked — syncing/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not link: denied");
  });
});
