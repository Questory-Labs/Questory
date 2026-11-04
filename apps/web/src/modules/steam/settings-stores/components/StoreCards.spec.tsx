import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { NavCounts, StoreAccountStatus } from "@questorylabs/shared";
import { StoreComingLaterCard } from "./StoreComingLaterCard";
import { StoresSteamHero } from "./StoresSteamHero";

vi.mock("../../settings-shared/SyncNowButton", () => ({
  SyncNowButton: () => <button type="button">Sync now</button>,
}));

const counts = (value: NavCounts | undefined) =>
  ({ value, ready: !!value, empty: !value, failed: false }) as UseResourceResult<NavCounts>;

const navCounts: NavCounts = {
  library: 1234,
  wishlist: 56,
  musicListens: 0,
  watchTitles: 0,
  readTitles: 0,
  activeGoals: 0,
  connectedSources: 1,
};

const steam: StoreAccountStatus = {
  store: "steam",
  connected: true,
  syncEnabled: true,
  status: "connected",
  displayName: "Sam",
  externalUserId: "76561198000001234",
  lastSyncedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
};

describe("StoresSteamHero", () => {
  afterEach(cleanup);

  it("renders the masked account, counts and sync", () => {
    render(<StoresSteamHero status={steam} navCounts={counts(navCounts)} />);
    expect(screen.getByRole("heading", { name: /Steam/ })).toBeInTheDocument();
    expect(screen.getByText("Connected · Sam · SteamID 7656••••••••1234")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("3h ago")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
    expect(screen.getByText("Sync runs automatically")).toBeInTheDocument();
  });

  it("shows dashes when counts are unavailable", () => {
    render(<StoresSteamHero status={{ ...steam, lastSyncedAt: null }} navCounts={counts(undefined)} />);
    const dl = screen.getByText("Library").closest("dl")!;
    expect(within(dl).getAllByText("—")).toHaveLength(3);
  });

  it("links to Connections when Steam is not linked", () => {
    render(
      <StoresSteamHero
        status={{ store: "steam", connected: false, syncEnabled: false }}
        navCounts={counts(navCounts)}
      />,
    );
    expect(screen.getByText("Not linked")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link Steam" })).toHaveAttribute("href", "/settings/connections");
    expect(screen.queryByRole("button", { name: "Sync now" })).toBeNull();
    expect(screen.queryByText("Library")).toBeNull();
  });
});

describe("StoreComingLaterCard", () => {
  afterEach(cleanup);

  it("marks planned stores as coming later", () => {
    render(
      <StoreComingLaterCard
        status={{ store: "epic", connected: false, syncEnabled: false, status: "coming_later" }}
        index={2}
      />,
    );
    expect(screen.getByRole("heading", { name: "Epic Games" })).toBeInTheDocument();
    expect(screen.getByText("Coming later")).toBeInTheDocument();
    expect(screen.getByText("Manual import planned")).toBeInTheDocument();
  });

  it("marks enabled stores as connected", () => {
    render(
      <StoreComingLaterCard
        status={{ store: "gog", connected: true, syncEnabled: true, status: "connected" }}
        index={3}
      />,
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText("Manual import planned")).toBeNull();
  });
});
