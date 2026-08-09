import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { MusicGate } from "./MusicGate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/hooks/useMusicEnabled", () => ({
  useMusicEnabled: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({
    user: {
      id: "u1",
      steamId: "76561198000000000",
      personaName: "Alice",
      avatarUrl: null,
    },
  }),
}));

import { useMusicEnabled } from "@/hooks/useMusicEnabled";

function wrap(ui: React.ReactNode) {
  const qc = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={qc}>{ui}</ResourceProvider>,
  );
}

describe("MusicGate", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("redirects to dashboard when flag off", async () => {
    vi.mocked(useMusicEnabled).mockReturnValue({
      flagOn: false,
      showMusicNav: false,
      isLoading: false,
    } as any);
    wrap(
      <MusicGate>
        <div>music</div>
      </MusicGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
