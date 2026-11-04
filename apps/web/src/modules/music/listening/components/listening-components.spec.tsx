import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MusicRecentListen } from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListenDayGroup } from "./ListenDayGroup";
import { ListeningFilters } from "./ListeningFilters";

const row: MusicRecentListen = {
  id: "l1",
  listenedAt: "2026-08-01T12:00:00.000Z",
  track: {
    id: "t1",
    title: "Helix",
    artistId: "a1",
    artistName: "Ayla",
    releaseId: "r1",
    releaseTitle: "Spiral",
    imageUrl: null,
    genres: ["ambient"],
  },
  mediaPlayer: "mpv",
  submissionClient: "questory_lastfm",
  musicService: "Spotify",
};

describe("music listening components", () => {
  afterEach(cleanup);

  it("renders a day group with summary, links, chips and source", () => {
    render(
      <ListenDayGroup
        summary="62 listens · 3h 50m"
        group={{ dayKey: "2026-08-01", label: "Today", items: [row] }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("62 listens · 3h 50m")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Helix" })).toHaveAttribute("href", "/music/tracks/t1");
    expect(screen.getByRole("link", { name: "Ayla" })).toHaveAttribute("href", "/music/artists/a1");
    expect(screen.getByRole("link", { name: "Spiral" })).toHaveAttribute("href", "/music/albums/r1");
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.getByText("mpv")).toBeInTheDocument();
    expect(screen.getByText("ambient")).toBeInTheDocument();
    expect(screen.getByText("Last.fm")).toBeInTheDocument();
  });

  it("filters by text and source", () => {
    const onQueryChange = vi.fn();
    const onSourceChange = vi.fn();
    render(
      <ListeningFilters
        query=""
        onQueryChange={onQueryChange}
        source="imports"
        onSourceChange={onSourceChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Imports" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ay" } });
    expect(onQueryChange).toHaveBeenCalledWith("ay");
    fireEvent.click(screen.getByRole("button", { name: "ListenBrainz" }));
    expect(onSourceChange).toHaveBeenCalledWith("listenbrainz");
  });
});
