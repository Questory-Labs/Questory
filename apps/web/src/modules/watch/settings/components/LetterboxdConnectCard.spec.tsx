import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { LetterboxdConnectCard } from "./LetterboxdConnectCard";

vi.mock("@/lib/watch", () => ({
  watchFetch: vi.fn(),
}));

import { watchFetch } from "@/lib/watch";

function wrap(ui: React.ReactNode) {
  const client = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={client}>{ui}</ResourceProvider>,
  );
}

describe("LetterboxdConnectCard", () => {
  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
    vi.mocked(watchFetch).mockResolvedValue({
      connected: false,
      username: null,
      lastSyncedAt: null,
      syncCursor: null,
    });
  });

  it("shows connect form when disconnected", async () => {
    wrap(<LetterboxdConnectCard />);
    await waitFor(() => {
      expect(screen.getByLabelText("Letterboxd username")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("submits username on connect", async () => {
    vi.mocked(watchFetch).mockImplementation(async (path, init) => {
      if (path === "/letterboxd/status") {
        return {
          connected: false,
          username: null,
          lastSyncedAt: null,
          syncCursor: null,
        };
      }
      if (path === "/letterboxd/connect" && init?.method === "POST") {
        return {
          connected: true,
          username: "username",
          lastSyncedAt: null,
          syncCursor: null,
        };
      }
      throw new Error(`unexpected ${path}`);
    });

    wrap(<LetterboxdConnectCard />);
    await waitFor(() => {
      expect(screen.getAllByLabelText("Letterboxd username").length).toBeGreaterThan(0);
    });
    const input = screen.getAllByLabelText("Letterboxd username")[0];
    fireEvent.change(input, {
      target: { value: "username" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() => {
      expect(watchFetch).toHaveBeenCalledWith(
        "/letterboxd/connect",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("confirms before disconnecting", async () => {
    vi.mocked(watchFetch).mockImplementation(async (path, init) => {
      if (path === "/letterboxd/status") {
        return { connected: true, username: "me", lastSyncedAt: null, syncCursor: "entry-1" };
      }
      if (path === "/letterboxd/connect" && init?.method === "DELETE") return { ok: true };
      throw new Error(`unexpected ${path}`);
    });

    wrap(<LetterboxdConnectCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    expect(screen.getByText("Latest entry: entry-1")).toBeInTheDocument();
    expect(watchFetch).not.toHaveBeenCalledWith("/letterboxd/connect", expect.anything());
    const buttons = screen.getAllByRole("button", { name: "Disconnect" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(watchFetch).toHaveBeenCalledWith("/letterboxd/connect", { method: "DELETE" });
    });
  });
});
