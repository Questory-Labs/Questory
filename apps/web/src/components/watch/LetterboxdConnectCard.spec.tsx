import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryCache, QHttpQueryProvider } from "@questorylabs/qhttp/react";
import { LetterboxdConnectCard } from "./LetterboxdConnectCard";

vi.mock("@/lib/watch", () => ({
  watchFetch: vi.fn(),
}));

import { watchFetch } from "@/lib/watch";

function wrap(ui: React.ReactNode) {
  const client = new QueryCache({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QHttpQueryProvider client={client}>{ui}</QHttpQueryProvider>,
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
});
