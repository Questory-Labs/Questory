import { act, renderHook, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiOnce: vi.fn(),
}));

import { apiOnce as api } from "@/lib/api";
import { userSyncErrorMessage, useUserSync } from "./useUserSync";

const httpError = (status: number, body: object) =>
  Object.assign(new Error(JSON.stringify({ statusCode: status, ...body })), { status });

const wrapper = ({ children }: { children: ReactNode }) => (
  <ResourceProvider store={new ResourceStore({ retries: false })}>{children}</ResourceProvider>
);

describe("userSyncErrorMessage", () => {
  it("maps 409 and 429 responses", () => {
    expect(userSyncErrorMessage(httpError(409, { message: "busy" }))).toEqual({
      message: "A sync is already running.",
      retryAfterSec: 0,
    });
    expect(userSyncErrorMessage(httpError(429, { retryAfterSec: 30 }))).toEqual({
      message: "Sync was requested recently.",
      retryAfterSec: 30,
    });
    expect(userSyncErrorMessage(httpError(500, { message: "boom" })).message).toBe("boom");
  });
});

describe("useUserSync", () => {

  it("posts to /sync/user and marks the sync queued", async () => {
    vi.mocked(api).mockResolvedValue({ queued: true });
    const { result } = renderHook(() => useUserSync(), { wrapper });
    act(() => result.current.sync());
    await waitFor(() => expect(result.current.queued).toBe(true));
    expect(api).toHaveBeenCalledWith("/sync/user", { method: "POST" });
    expect(result.current.error).toBeNull();
  });

  it("counts down retryAfterSec on 429 and disables until it ends", async () => {
    vi.mocked(api).mockImplementation(async () => {
      throw httpError(429, { retryAfterSec: 2 });
    });
    const { result } = renderHook(() => useUserSync(), { wrapper });
    act(() => result.current.sync());
    await waitFor(() => expect(result.current.retryIn).toBe(2));
    expect(result.current.disabled).toBe(true);
    expect(result.current.error).toBe("Sync was requested recently.");
    await waitFor(() => expect(result.current.retryIn).toBe(0), { timeout: 3_500 });
    expect(result.current.disabled).toBe(false);
  });
});
