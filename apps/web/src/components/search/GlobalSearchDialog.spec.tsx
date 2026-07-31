import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { GlobalSearchProvider, useGlobalSearch } from "./GlobalSearchProvider";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/useMusicEnabled", () => ({
  useMusicEnabled: vi.fn(() => ({
    showMusicNav: true,
    flagOn: true,
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useWatchEnabled", () => ({
  useWatchEnabled: vi.fn(() => ({
    enabled: true,
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useReadEnabled", () => ({
  useReadEnabled: vi.fn(() => ({
    showReadNav: true,
    isLoading: false,
  })),
}));

const api = vi.fn();
vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => api(...args),
}));

function OpenPalette({ query = "" }: { query?: string }) {
  const { setOpen, setQuery } = useGlobalSearch();
  useEffect(() => {
    setOpen(true);
    if (query) setQuery(query);
  }, [query, setOpen, setQuery]);
  return null;
}

function renderPalette(query = "") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <GlobalSearchProvider>
        <GlobalSearchDialog />
        <OpenPalette query={query} />
      </GlobalSearchProvider>
    </QueryClientProvider>,
  );
}

describe("GlobalSearchDialog", () => {
  beforeEach(() => {
    push.mockReset();
    api.mockReset();
    api.mockResolvedValue({
      games: [
        {
          appId: 10,
          gameId: "g1",
          name: "Portal",
          headerImage: null,
          source: "library",
        },
      ],
      friends: [],
      developers: [],
      publishers: [],
      collections: [],
      music: { artists: [], albums: [], tracks: [] },
      watch: { movies: [], shows: [] },
      read: { titles: [] },
    });
  });

  it("fetches debounced search results", async () => {
    renderPalette();

    const input = await screen.findByPlaceholderText(/Search games/i);
    fireEvent.change(input, { target: { value: "portal" } });

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/search?q=portal&limit=8");
    });

    await waitFor(() => {
      expect(screen.getByText("Portal")).toBeInTheDocument();
    });
  });

  it("hides music groups when music is disabled", async () => {
    const { useMusicEnabled } = await import("@/hooks/useMusicEnabled");
    vi.mocked(useMusicEnabled).mockReturnValue({
      showMusicNav: false,
      flagOn: false,
      isLoading: false,
    } as never);

    api.mockResolvedValue({
      games: [],
      friends: [],
      developers: [],
      publishers: [],
      collections: [],
      music: {
        artists: [{ id: "a1", name: "Radiohead" }],
        albums: [],
        tracks: [],
      },
      watch: { movies: [], shows: [] },
      read: { titles: [] },
    });

    renderPalette("radio");

    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(screen.queryByText("Radiohead")).not.toBeInTheDocument();
  });

  it("handles legacy search payloads without music/watch/read", async () => {
    api.mockResolvedValue({
      games: [
        {
          appId: 10,
          gameId: "g1",
          name: "Portal",
          headerImage: null,
          source: "library",
        },
      ],
      friends: [],
      developers: [],
      publishers: [],
      collections: [],
    });

    renderPalette("portal");

    await waitFor(() => expect(api).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText("Portal")).toBeInTheDocument();
    });
  });
});
