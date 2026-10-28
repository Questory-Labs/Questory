import { act, renderHook, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
const bump = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/providers/StatusProvider", () => ({ useDropEpochBump: () => bump }));
vi.mock("@/lib/api", () => ({ api: vi.fn(), apiOnce: vi.fn() }));

import { api, apiOnce } from "@/lib/api";
import {
  useChangePassword,
  useDeleteAccount,
  useProfileApiKeys,
  useRecapSettings,
} from "./steam.settings-profile.hooks";

const makeWrapper = (store = new ResourceStore({ retries: false })) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ResourceProvider store={store}>{children}</ResourceProvider>
  );
  return Wrapper;
};

const httpError = (status: number, body: object) =>
  Object.assign(new Error(JSON.stringify({ statusCode: status, ...body })), { status });

const form = {
  currentPassword: "old-password",
  newPassword: "new-password-1",
  confirmPassword: "new-password-1",
};

describe("useChangePassword", () => {
  it("validates locally without calling the API", () => {
    const { result } = renderHook(() => useChangePassword(), { wrapper: makeWrapper() });
    act(() => result.current.submit({ ...form, confirmPassword: "nope-nope-nope" }));
    expect(result.current.error).toBe("New passwords don't match.");
    expect(apiOnce).not.toHaveBeenCalled();
  });

  it("posts to /auth/password and closes on success", async () => {
    vi.mocked(apiOnce).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useChangePassword(), { wrapper: makeWrapper() });
    act(() => result.current.setOpen(true));
    act(() => result.current.submit(form));
    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.open).toBe(false);
    expect(apiOnce).toHaveBeenLastCalledWith("/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });
  });

  it("surfaces a wrong current password", async () => {
    vi.mocked(apiOnce).mockImplementationOnce(async () => {
      throw httpError(401, { message: "Unauthorized" });
    });
    const { result } = renderHook(() => useChangePassword(), { wrapper: makeWrapper() });
    act(() => result.current.submit(form));
    await waitFor(() => expect(result.current.error).toBe("Current password is incorrect."));
  });
});

describe("useDeleteAccount", () => {
  it("only deletes after typing DELETE, then drops the cache and goes to login", async () => {
    vi.mocked(apiOnce).mockResolvedValueOnce({ ok: true });
    const store = new ResourceStore({ retries: false });
    const drop = vi.spyOn(store, "drop");
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: makeWrapper(store) });
    act(() => result.current.setOpen(true));
    act(() => result.current.setConfirmText("delete"));
    act(() => result.current.submit());
    expect(apiOnce).not.toHaveBeenCalledWith("/users/me", expect.anything());
    act(() => result.current.setConfirmText("DELETE"));
    act(() => result.current.submit());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(apiOnce).toHaveBeenLastCalledWith("/users/me", {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    expect(drop).toHaveBeenCalled();
    expect(bump).toHaveBeenCalled();
  });
});

describe("useProfileApiKeys", () => {
  it("keeps the plaintext token only after create and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === "/api-keys/identity") return { steamId: null, listenbrainzUsername: null, keys: [] };
      return { id: "k1", type: "music_ingest", tokenPrefix: "qm_ab", token: "qm_secret" };
    });
    const { result } = renderHook(() => useProfileApiKeys(), { wrapper: makeWrapper() });
    expect(result.current.plainToken).toBeNull();
    act(() => result.current.create.submit("music_ingest"));
    await waitFor(() =>
      expect(result.current.plainToken).toEqual({ type: "music_ingest", token: "qm_secret" }),
    );
    act(() => result.current.copy("watch_webhook"));
    expect(writeText).not.toHaveBeenCalled();
    act(() => result.current.copy("music_ingest"));
    await waitFor(() => expect(result.current.copied).toBe("music_ingest"));
    expect(writeText).toHaveBeenCalledWith("qm_secret");
  });
});

describe("useRecapSettings", () => {
  it("saves the monthly flag with PUT", async () => {
    vi.mocked(api).mockImplementation(async () => ({ monthly: true, global: false }));
    const { result } = renderHook(() => useRecapSettings(), { wrapper: makeWrapper() });
    act(() => result.current.save.submit(true));
    await waitFor(() => expect(result.current.save.succeeded).toBe(true));
    expect(api).toHaveBeenCalledWith("/recap/settings", {
      method: "PUT",
      body: JSON.stringify({ monthly: true }),
    });
  });
});
