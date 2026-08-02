import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/enterprise-api", () => ({
  fetchEnterpriseStatus: vi.fn(),
}));

import { fetchEnterpriseStatus } from "@/lib/enterprise-api";
import {
  EnterpriseEnabledProvider,
  useEnterpriseEnabled,
} from "./useEnterpriseEnabled";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <EnterpriseEnabledProvider>{children}</EnterpriseEnabledProvider>
    </QueryClientProvider>
  );
}

describe("useEnterpriseEnabled", () => {
  const prev = process.env.ENTERPRISE;

  afterEach(() => {
    if (prev === undefined) delete process.env.ENTERPRISE;
    else process.env.ENTERPRISE = prev;
  });

  beforeEach(() => {
    vi.mocked(fetchEnterpriseStatus).mockReset();
  });

  it("is disabled when ENTERPRISE is not set (skips status fetch)", () => {
    delete process.env.ENTERPRISE;

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    expect(result.current.flagOn).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(vi.mocked(fetchEnterpriseStatus)).not.toHaveBeenCalled();
  });

  it("is enabled when ENTERPRISE=true and status answers", async () => {
    process.env.ENTERPRISE = "true";
    vi.mocked(fetchEnterpriseStatus).mockResolvedValue({
      available: true,
      service: { ok: true, ready: true },
    });

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.serviceOk).toBe(true);
    expect(vi.mocked(fetchEnterpriseStatus)).toHaveBeenCalledTimes(1);
  });

  it("is disabled when the endpoint is unreachable", async () => {
    process.env.ENTERPRISE = "TRUE";
    const err = new Error("Not found") as Error & { status?: number };
    err.status = 404;
    vi.mocked(fetchEnterpriseStatus).mockRejectedValue(err);

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
    expect(result.current.serviceOk).toBe(false);
  });

  it("reports serviceOk=false when available but service.ok is false", async () => {
    process.env.ENTERPRISE = "on";
    vi.mocked(fetchEnterpriseStatus).mockResolvedValue({
      available: true,
      service: { ok: false },
    });

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.serviceOk).toBe(false);
  });

  it("throws when used outside EnterpriseEnabledProvider", () => {
    expect(() => renderHook(() => useEnterpriseEnabled())).toThrow(
      "useEnterpriseEnabled must be used within EnterpriseEnabledProvider",
    );
  });

  it("fetches status once for multiple consumers in the same provider", async () => {
    process.env.ENTERPRISE = "true";
    vi.mocked(fetchEnterpriseStatus).mockResolvedValue({
      available: true,
      service: { ok: true },
    });

    const { result } = renderHook(
      () => ({
        first: useEnterpriseEnabled(),
        second: useEnterpriseEnabled(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.first.enabled).toBe(true));
    expect(result.current.second.enabled).toBe(true);
    expect(result.current.first).toBe(result.current.second);
    expect(vi.mocked(fetchEnterpriseStatus)).toHaveBeenCalledTimes(1);
  });
});
