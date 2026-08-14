import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { GlobalSearchProvider } from "./GlobalSearchProvider";
import { HeaderSearch } from "./HeaderSearch";

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

function renderHeaderSearch() {
  const qc = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={qc}>
      <GlobalSearchProvider>
        <HeaderSearch />
      </GlobalSearchProvider>
    </ResourceProvider>,
  );
}

describe("HeaderSearch", () => {
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

  afterEach(() => {
    cleanup();
  });

  it("shows a results dropdown while typing", async () => {
    renderHeaderSearch();

    const input = screen.getByPlaceholderText(/Search games/i);
    expect(screen.queryByText("Portal")).not.toBeInTheDocument();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "portal" } });

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/search?q=portal&limit=8");
    });

    await waitFor(() => {
      expect(screen.getByText("Portal")).toBeInTheDocument();
    });
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText(/View all results for “portal”/)).toBeInTheDocument();
  });

  it("navigates when a result is selected", async () => {
    renderHeaderSearch();

    const input = screen.getByPlaceholderText(/Search games/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "portal" } });

    const result = await screen.findByText("Portal");
    fireEvent.click(result);

    expect(push).toHaveBeenCalledWith("/library/g1");
  });

  it("clears the query and closes the dropdown on Escape", async () => {
    renderHeaderSearch();

    const input = screen.getByPlaceholderText(/Search games/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "portal" } });

    await screen.findByText("Portal");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
    expect(screen.queryByText("Portal")).not.toBeInTheDocument();
    expect(screen.queryByText("Games")).not.toBeInTheDocument();
  });

  it("clears the query when clicking outside the search field", async () => {
    renderHeaderSearch();

    const input = screen.getByPlaceholderText(/Search games/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "portal" } });

    await screen.findByText("Portal");

    fireEvent.mouseDown(document.body);

    expect(input).toHaveValue("");
    expect(screen.queryByText("Portal")).not.toBeInTheDocument();
  });
});
