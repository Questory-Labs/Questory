import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "./AuthGate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
}

describe("AuthGate", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(api).mockReset();
  });

  it("redirects unauthenticated users home", async () => {
    vi.mocked(api).mockResolvedValue({ user: null });
    wrap(
      <AuthGate>
        <div>secret</div>
      </AuthGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children when authenticated", async () => {
    vi.mocked(api).mockResolvedValue({
      user: {
        id: "u1",
        steamId: "76561198000000000",
        personaName: "Alice",
        avatarUrl: null,
      },
    });
    wrap(
      <AuthGate>
        <div>secret</div>
      </AuthGate>,
    );
    expect(await screen.findByText("secret")).toBeInTheDocument();
  });
});
