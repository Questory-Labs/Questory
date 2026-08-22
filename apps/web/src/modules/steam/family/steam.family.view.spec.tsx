import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  FamilyInsights,
  FamilyLibrary,
  FriendsListResponse,
} from "@questorylabs/shared";
import { FamilyView } from "./steam.family.view";
import type { FamilyViewProps } from "./steam.family.types";

vi.mock("@/components/FamilyGameSidebar", () => ({
  FamilyGameSidebar: () => null,
}));

const reload = async () => undefined;
const noop = () => undefined;

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

const member = {
  steamId: "1",
  personaName: "Sam",
  librarySize: 5,
  isMe: true,
};

const insightsValue: FamilyInsights = {
  memberCount: 1,
  totalUniqueGames: 10,
  overlapCount: 2,
  duplicatePurchases: 0,
  familyValue: 100,
  currency: "USD",
  suggestedPurchaser: null,
  members: [member],
  conflicts: [],
};

const libraryValue: FamilyLibrary = {
  total: 1,
  page: 1,
  pageSize: 15,
  meSteamId: "1",
  members: [member],
  items: [
    {
      appId: 10,
      name: "Portal",
      headerImage: null,
      ownerCount: 1,
      owners: [
        {
          steamId: "1",
          personaName: "Sam",
          avatarUrl: null,
          isMe: true,
        },
      ],
      familyPlaytimeHours: 3,
      currentPrice: 10,
      lowestPrice: 5,
    },
  ],
};

const emptyLibrary: FamilyLibrary = {
  ...libraryValue,
  total: 0,
  items: [],
};

const emptyFriends: FriendsListResponse = {
  friends: [],
  total: 0,
  page: 1,
  pageSize: 100,
  meta: {
    totalFriends: 0,
    librariesCached: 0,
    libraryCacheLimit: 0,
    gamesPerFriendLimit: 0,
    truncated: false,
    lastSyncedAt: null,
  },
};

const defaults: FamilyViewProps = {
  insights: resource<FamilyInsights>({
    empty: false,
    failed: false,
    value: insightsValue,
  }),
  library: resource<FamilyLibrary>({
    empty: false,
    failed: false,
    value: libraryValue,
  }),
  conflicts: resource<FamilyLibrary>({
    empty: false,
    failed: false,
    value: emptyLibrary,
  }),
  friends: resource<FriendsListResponse>({
    empty: false,
    failed: false,
    value: emptyFriends,
  }),
  members: insightsValue.members,
  steamId: "",
  setSteamId: noop,
  addError: null,
  addBusy: false,
  onAdd: noop,
  showImport: false,
  onToggleImport: noop,
  importable: [],
  selected: new Set(),
  importFilter: "",
  setImportFilter: noop,
  toggle: noop,
  toggleAll: noop,
  importBusy: false,
  onImportSelected: noop,
  activeMember: "all",
  setActiveMember: noop,
  gameSearch: "",
  setGameSearch: noop,
  page: 1,
  setPage: noop,
  conflictsPage: 1,
  setConflictsPage: noop,
  selectedAppId: null,
  setSelectedAppId: noop,
};

const renderView = (patch: Partial<FamilyViewProps>) =>
  render(<FamilyView {...({ ...defaults, ...patch } as FamilyViewProps)} />);

describe("FamilyView", () => {
  afterEach(cleanup);

  it("shows skeletons when insights are empty", () => {
    renderView({
      insights: resource<FamilyInsights>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
  });

  it("shows an error when insights failed", () => {
    renderView({
      insights: resource<FamilyInsights>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load family insights."),
    ).toBeInTheDocument();
  });

  it("renders insights when ready", () => {
    renderView({});
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Portal")).toBeInTheDocument();
  });

  it("shows empty copy when ready with no members", () => {
    renderView({
      insights: resource<FamilyInsights>({
        empty: false,
        failed: false,
        value: { ...insightsValue, memberCount: 0, members: [] },
      }),
      members: [],
    });
    expect(
      screen.getAllByText(
        "No members yet. Import friends or add a SteamID64 above.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows empty copy when the library collection is empty", () => {
    renderView({
      library: resource<FamilyLibrary>({
        empty: false,
        failed: false,
        value: emptyLibrary,
      }),
    });
    expect(
      screen.getByText(
        "No shareable games for this filter. Sync libraries or try another member.",
      ),
    ).toBeInTheDocument();
  });
});
