import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type {
  MusicAlbumDetail,
  MusicAlbumListenPage,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MusicAlbumView } from "./music.album.view";
import type { MusicAlbumViewProps } from "./music.album.types";

vi.mock("@/lib/music", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/music")>();
  return { ...actual, musicFetch: vi.fn().mockResolvedValue({}) };
});

const detail: MusicAlbumDetail = {
  range: "all",
  album: {
    id: "r1",
    title: "Skin",
    userDisplayName: null,
    year: 2016,
    imageUrl: null,
    artistId: "a1",
    artistName: "Flume",
  },
  listenCount: 8,
  listeningMinutes: 40,
  peakHour: null,
  peakDow: null,
  topTracks: [{ id: "t1", title: "Helix", count: 3 }],
  topMoods: [],
};

const idleListens = mockResource<MusicAlbumListenPage>({
  empty: false,
  failed: false,
  value: { total: 0, page: 1, pageSize: 15, items: [] },
});
const idleSeries = mockResource<MusicTimeBucket[]>({
  empty: false,
  failed: false,
  value: [],
});

const wrap = (ui: React.ReactNode) => {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
};

const renderView = (patch: Partial<MusicAlbumViewProps> = {}) =>
  wrap(
    <MusicAlbumView
      {...({
        id: "r1",
        range: "all",
        onRangeChange: () => {},
        page: 1,
        setPage: () => {},
        detail: mockResource({ empty: false, failed: false, value: detail }),
        listens: idleListens,
        hourSeries: idleSeries,
        dowSeries: idleSeries,
        saveBusy: false,
        onSave: async () => {},
        ...patch,
      } as MusicAlbumViewProps)}
    />,
  );

describe("MusicAlbumView", () => {
  afterEach(cleanup);

  it("shows an error when the album failed", () => {
    renderView({
      detail: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Album not found.")).toBeInTheDocument();
  });

  it("renders tracks when ready", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Skin" })).toBeInTheDocument();
    expect(screen.getAllByText("Helix").length).toBeGreaterThan(0);
  });
});
