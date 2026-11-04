import { renderHook, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";
import { useNavCounts } from "./useNavCounts";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ResourceProvider store={new ResourceStore({ retries: false })}>{children}</ResourceProvider>
);

const counts = {
  library: 12,
  wishlist: 3,
  musicListens: 400,
  watchTitles: 9,
  readTitles: 2,
  activeGoals: 1,
  connectedSources: 4,
};

describe("useNavCounts", () => {
  it("loads /shell/nav-counts", async () => {
    vi.mocked(api).mockResolvedValue(counts);
    const { result } = renderHook(() => useNavCounts(), { wrapper });
    await waitFor(() => expect(result.current.value).toEqual(counts));
    expect(api).toHaveBeenCalledWith("/shell/nav-counts");
  });

  it("does not load when disabled", async () => {
    vi.mocked(api).mockClear();
    renderHook(() => useNavCounts({ enabled: false }), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(api).not.toHaveBeenCalled();
  });
});
