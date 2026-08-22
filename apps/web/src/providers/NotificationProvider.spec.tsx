import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import type { AppNotification, User } from "@questorylabs/shared";

vi.mock("@/lib/auth-api", () => ({
  ME_RESOURCE_ID: ["me"],
  fetchMe: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  apiOnce: vi.fn(),
}));

import { fetchMe } from "@/lib/auth-api";
import { api } from "@/lib/api";
import { UserProvider, useUser } from "./UserProvider";
import { NotificationProvider, useNotifications } from "./NotificationProvider";

const alice: User = {
  id: "u1",
  steamId: "76561198000000000",
  personaName: "Alice",
  avatarUrl: null,
  profileUrl: null,
};

const sample: AppNotification = {
  id: "n1",
  type: "deal",
  title: "Sale",
  body: "Game is cheap",
  href: "/wishlist",
  readAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const store = new ResourceStore({ retries: false });
  return (
    <ResourceProvider store={store}>
      <UserProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </UserProvider>
    </ResourceProvider>
  );
}

describe("useNotifications", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(fetchMe).mockReset();
    vi.mocked(api).mockReset();
  });

  it("throws when used outside NotificationProvider", () => {
    expect(() => renderHook(() => useNotifications())).toThrow(
      "useNotifications must be used within NotificationProvider",
    );
  });

  it("does not fetch notifications when signed out", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ user: null });

    const { result } = renderHook(
      () => ({
        user: useUser(),
        notifications: useNotifications(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.user.authReady).toBe(true));
    expect(result.current.notifications.unreadCount).toBe(0);
    expect(vi.mocked(api)).not.toHaveBeenCalled();
  });

  it("loads unread count when signed in and list when opened", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ user: alice });
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === "/notifications/unread-count") return { count: 2 };
      if (path === "/notifications") return [sample];
      throw new Error(path);
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.unreadCount).toBe(2));
    expect(result.current.items).toEqual([]);

    act(() => {
      result.current.setListOpen(true);
    });

    await waitFor(() => expect(result.current.items).toEqual([sample]));
    expect(vi.mocked(api)).toHaveBeenCalledWith("/notifications/unread-count");
    expect(vi.mocked(api)).toHaveBeenCalledWith("/notifications");
  });

  it("shares one value for multiple consumers in the same provider", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ user: alice });
    vi.mocked(api).mockResolvedValue({ count: 0 });

    const { result } = renderHook(
      () => ({
        first: useNotifications(),
        second: useNotifications(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.first.unreadCount).toBe(0));
    expect(result.current.first).toBe(result.current.second);
  });
});
