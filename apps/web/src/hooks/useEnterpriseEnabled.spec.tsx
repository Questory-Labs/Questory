import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/enterprise-api", () => ({
  fetchEnterpriseStatus: vi.fn(),
}));

import { fetchEnterpriseStatus } from "@/lib/enterprise-api";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function loadHook() {
  vi.resetModules();
  return import("./useEnterpriseEnabled");
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

  it("is disabled when ENTERPRISE is not set (skips status fetch)", async () => {
    delete process.env.ENTERPRISE;
    const { useEnterpriseEnabled } = await loadHook();

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    expect(result.current.flagOn).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(vi.mocked(fetchEnterpriseStatus)).not.toHaveBeenCalled();
  });

  it("is enabled when ENTERPRISE=true and status answers", async () => {
    process.env.ENTERPRISE = "true";
    const { useEnterpriseEnabled } = await loadHook();
    vi.mocked(fetchEnterpriseStatus).mockResolvedValue({
      available: true,
      service: { ok: true, ready: true },
    });

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.serviceOk).toBe(true);
    expect(vi.mocked(fetchEnterpriseStatus)).toHaveBeenCalled();
  });

  it("is disabled when the endpoint is unreachable", async () => {
    process.env.ENTERPRISE = "TRUE";
    const { useEnterpriseEnabled } = await loadHook();
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
    const { useEnterpriseEnabled } = await loadHook();
    vi.mocked(fetchEnterpriseStatus).mockResolvedValue({
      available: true,
      service: { ok: false },
    });

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.serviceOk).toBe(false);
  });
});
