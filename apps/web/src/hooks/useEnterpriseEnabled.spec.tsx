import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEnterpriseEnabled } from "./useEnterpriseEnabled";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useEnterpriseEnabled", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  it("is enabled when /enterprise/status answers", async () => {
    vi.mocked(api).mockResolvedValue({
      available: true,
      engine: { ok: true, ready: true },
    });

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.engineOk).toBe(true);
    expect(vi.mocked(api)).toHaveBeenCalledWith("/enterprise/status");
  });

  it("is disabled when the endpoint 404s (community API)", async () => {
    const err = new Error("Not found") as Error & { status?: number };
    err.status = 404;
    vi.mocked(api).mockRejectedValue(err);

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
    expect(result.current.engineOk).toBe(false);
  });

  it("reports engineOk=false when the extension is up but the engine is down", async () => {
    vi.mocked(api).mockResolvedValue({
      available: true,
      engine: { ok: false },
    });

    const { result } = renderHook(() => useEnterpriseEnabled(), { wrapper });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.engineOk).toBe(false);
  });
});
