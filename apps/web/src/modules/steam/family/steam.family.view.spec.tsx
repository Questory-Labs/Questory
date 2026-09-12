import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  ResourceProvider,
  ResourceStore,
  type UseResourceResult,
} from "@questorylabs/qhttp/react";
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

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
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
  role: "owner",
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
  onOpenImport: noop,
  onCloseImport: noop,
  importable: [],
  selected: new Set(),
  importFilter: "",
  setImportFilter: noop,
  toggle: noop,
  toggleAll: noop,
  importBusy: false,
  onImportSelected: noop,
  importError: null,
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
  remainingSlots: 5,
  familyAtCapacity: false,
};

const renderView = (patch: Partial<FamilyViewProps>) => {
  const store = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={store}>
      <FamilyView {...({ ...defaults, ...patch } as FamilyViewProps)} />
    </ResourceProvider>,
  );
};

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

  it("groups the steam id field with add member, not import", () => {
    renderView({});
    const input = screen.getByPlaceholderText("Add member SteamID64");
    const add = screen.getByRole("button", { name: "Add member" });
    const form = input.closest("form");
    expect(form).not.toBeNull();
    expect(add.closest("form")).toBe(form);
    expect(
      screen.getByRole("button", { name: "Import from friends" }).closest("form"),
    ).toBeNull();
  });

  it("opens import from friends in a dialog", () => {
    const onOpenImport = vi.fn();
    renderView({
      showImport: true,
      onOpenImport,
      importable: [{ steamId: "2", personaName: "Alex", avatarUrl: null }],
    });
    expect(
      screen.getByRole("dialog", { name: "Import from friends" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Hide friends" }),
    ).not.toBeInTheDocument();
  });

  it("opens the import dialog from the toolbar button", () => {
    const onOpenImport = vi.fn();
    renderView({ onOpenImport });
    fireEvent.click(screen.getByRole("button", { name: "Import from friends" }));
    expect(onOpenImport).toHaveBeenCalledTimes(1);
  });

  it("disables adding and importing when the family is full", () => {
    renderView({
      remainingSlots: 0,
      familyAtCapacity: true,
      steamId: "76561198000000002",
    });
    expect(screen.getByRole("button", { name: "Add member" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Import from friends" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Family is full (6 people, including you). Remove someone to add another.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a remove action for members who are not you", () => {
    const friend = {
      steamId: "2",
      personaName: "Alex",
      librarySize: 3,
      isMe: false,
      role: "member",
    };
    renderView({
      members: [member, friend],
      insights: resource<FamilyInsights>({
        empty: false,
        failed: false,
        value: {
          ...insightsValue,
          memberCount: 2,
          members: [member, friend],
        },
      }),
    });
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0);
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
