import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import type { User } from "@questorylabs/shared";

vi.mock("@/lib/auth-api", () => ({
  ME_RESOURCE_ID: ["me"],
  fetchMe: vi.fn(),
}));

import { fetchMe } from "@/lib/auth-api";
import { UserProvider, useUser } from "./UserProvider";

const alice: User = {
  id: "u1",
  steamId: "76561198000000000",
  personaName: "Alice",
  avatarUrl: null,
  profileUrl: null,
  email: "alice@example.com",
  isAdmin: true,
  countryCode: "IN",
  currency: "INR",
  priceRegionLocked: true,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const store = new ResourceStore({ retries: false });
  return (
    <ResourceProvider store={store}>
      <UserProvider>{children}</UserProvider>
    </ResourceProvider>
  );
}

describe("useUser", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(fetchMe).mockReset();
  });

  it("throws when used outside UserProvider", () => {
    expect(() => renderHook(() => useUser())).toThrow(
      "useUser must be used within UserProvider",
    );
  });

  it("reports signed out when /auth/me returns no user", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ user: null });

    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.authReady).toBe(true));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes the session user and admin flag", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ user: alice });

    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(alice);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user?.currency).toBe("INR");
  });

  it("fetches once for multiple consumers in the same provider", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ user: alice });

    const { result } = renderHook(
      () => ({
        first: useUser(),
        second: useUser(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.first.isAuthenticated).toBe(true));
    expect(result.current.second.isAuthenticated).toBe(true);
    expect(result.current.first).toBe(result.current.second);
    expect(vi.mocked(fetchMe)).toHaveBeenCalledTimes(1);
  });
});
