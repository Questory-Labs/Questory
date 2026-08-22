import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { MusicArtistDetail } from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MusicArtistView } from "./music.artist.view";
import type { MusicArtistViewProps } from "./music.artist.types";

vi.mock("@/lib/music", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/music")>();
  return { ...actual, musicFetch: vi.fn().mockResolvedValue({}) };
});

const detail: MusicArtistDetail = {
  range: "all",
  artist: {
    id: "a1",
    name: "Flume",
    userDisplayName: null,
    imageUrl: null,
    genres: ["electronic"],
  },
  listenCount: 12,
  firstListenAt: "2026-01-01T00:00:00.000Z",
  latestListenAt: "2026-08-01T00:00:00.000Z",
  topTracks: [{ id: "t1", title: "Helix", releaseTitle: null, count: 4 }],
  topAlbums: [],
  topMoods: [],
};

const wrap = (ui: React.ReactNode) => {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
};

const renderView = (patch: Partial<MusicArtistViewProps> = {}) =>
  wrap(
    <MusicArtistView
      {...({
        id: "a1",
        range: "all",
        setRange: () => {},
        detail: mockResource({ empty: false, failed: false, value: detail }),
        saveBusy: false,
        onSave: async () => {},
        ...patch,
      } as MusicArtistViewProps)}
    />,
  );

describe("MusicArtistView", () => {
  afterEach(cleanup);

  it("shows an error when the artist failed", () => {
    renderView({
      detail: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Artist not found.")).toBeInTheDocument();
  });

  it("renders top tracks when ready", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Flume" })).toBeInTheDocument();
    expect(screen.getAllByText("Helix").length).toBeGreaterThan(0);
  });
});
