import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { AuthGate } from "./AuthGate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  apiOnce: vi.fn(),
}));

import { apiOnce } from "@/lib/api";

function wrap(ui: React.ReactNode) {
  const qc = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={qc}>{ui}</ResourceProvider>,
  );
}

describe("AuthGate", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(apiOnce).mockReset();
  });

  it("redirects unauthenticated users to login", async () => {
    vi.mocked(apiOnce).mockResolvedValue({ user: null });
    wrap(
      <AuthGate>
        <div>secret</div>
      </AuthGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children when authenticated", async () => {
    vi.mocked(apiOnce).mockResolvedValue({
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
