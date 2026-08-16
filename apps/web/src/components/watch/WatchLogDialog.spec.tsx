import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatchLogDialog } from "./WatchLogDialog";

vi.mock("@/lib/watch", () => ({
  watchFetch: vi.fn(),
  WATCH_LOG_SEARCH_DEBOUNCE_MS: 0,
}));

import { watchFetch } from "@/lib/watch";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
}

describe("WatchLogDialog", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
  });

  it("shows search hits with source chips then submits a movie log", async () => {
    vi.mocked(watchFetch).mockImplementation(async (path, init) => {
      if (String(path).startsWith("/catalog/search")) {
        return {
          items: [
            {
              id: "tmdb:949",
              name: "Heat",
              year: 1995,
              type: "movie",
              posterUrl: null,
              tmdbId: 949,
              sources: ["tmdb"],
            },
          ],
        };
      }
      if (path === "/catalog/log" && init?.method === "POST") {
        return {
          id: "ev-1",
          titleId: "t1",
          watchedAt: "2026-08-16T12:00:00.000Z",
        };
      }
      throw new Error(`unexpected ${path}`);
    });

    const onClose = vi.fn();
    wrap(<WatchLogDialog open onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/Movie, series/i), {
      target: { value: "heat" },
    });

    expect(await screen.findByText("Heat (1995)")).toBeInTheDocument();
    expect(screen.getByText("Movie")).toBeInTheDocument();
    expect(screen.getByText("TMDB")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Heat \(1995\)/ }));
    expect(screen.queryByLabelText("Season")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "4.5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(watchFetch).toHaveBeenCalledWith(
        "/catalog/log",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const body = JSON.parse(
      String(
        vi.mocked(watchFetch).mock.calls.find((c) => c[0] === "/catalog/log")?.[1]
          ?.body,
      ),
    );
    expect(body).toMatchObject({
      tmdbId: 949,
      type: "movie",
      rating: 4.5,
    });
    expect(body.seasonNumber).toBeUndefined();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("requires season and episode fields for a TV hit", async () => {
    vi.mocked(watchFetch).mockResolvedValue({
      items: [
        {
          id: "anilist:1",
          name: "Frieren",
          year: 2023,
          type: "show",
          posterUrl: null,
          anilistId: 1,
          sources: ["anilist"],
        },
      ],
    });

    wrap(<WatchLogDialog open onClose={() => undefined} />);
    fireEvent.change(screen.getByPlaceholderText(/Movie, series/i), {
      target: { value: "frieren" },
    });

    expect(await screen.findByText("Frieren (2023)")).toBeInTheDocument();
    expect(screen.getByText("AniList")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Frieren/ }));
    expect(screen.getByLabelText("Season")).toBeInTheDocument();
    expect(screen.getByLabelText("Episode")).toBeInTheDocument();
  });

  it("rejects zero and negative episode numbers before submitting", async () => {
    vi.mocked(watchFetch).mockResolvedValue({
      items: [
        {
          id: "anilist:1",
          name: "Frieren",
          year: 2023,
          type: "show",
          posterUrl: null,
          anilistId: 1,
          sources: ["anilist"],
        },
      ],
    });

    wrap(<WatchLogDialog open onClose={() => undefined} />);
    fireEvent.change(screen.getByPlaceholderText(/Movie, series/i), {
      target: { value: "frieren" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Frieren/ }));

    fireEvent.change(screen.getByLabelText("Episode"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText("Enter a season and episode number"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Episode"), {
      target: { value: "-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText("Enter a season and episode number"),
    ).toBeInTheDocument();
    expect(
      vi.mocked(watchFetch).mock.calls.some((call) => call[0] === "/catalog/log"),
    ).toBe(false);
  });

  it("ignores a stale search response that arrives out of order", async () => {
    let resolveHeat!: (value: { items: unknown[] }) => void;
    const heat = new Promise<{ items: unknown[] }>((resolve) => {
      resolveHeat = resolve;
    });

    vi.mocked(watchFetch).mockImplementation(async (path) => {
      const href = String(path);
      if (href.includes("q=heat")) return heat as never;
      if (href.includes("q=frieren")) {
        return {
          items: [
            {
              id: "anilist:1",
              name: "Frieren",
              year: 2023,
              type: "show",
              posterUrl: null,
              anilistId: 1,
              sources: ["anilist"],
            },
          ],
        };
      }
      throw new Error(`unexpected ${path}`);
    });

    wrap(<WatchLogDialog open onClose={() => undefined} />);
    fireEvent.change(screen.getByPlaceholderText(/Movie, series/i), {
      target: { value: "heat" },
    });
    await waitFor(() => expect(watchFetch).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/Movie, series/i), {
      target: { value: "frieren" },
    });
    expect(await screen.findByText("Frieren (2023)")).toBeInTheDocument();

    resolveHeat({
      items: [
        {
          id: "tmdb:949",
          name: "Heat",
          year: 1995,
          type: "movie",
          posterUrl: null,
          tmdbId: 949,
          sources: ["tmdb"],
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("Frieren (2023)")).toBeInTheDocument();
    });
    expect(screen.queryByText("Heat (1995)")).not.toBeInTheDocument();
  });
});
