import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type {
  MusicHeatmap,
  MusicTimeBucket,
  MusicTrackDetail,
  MusicTrackListenPage,
} from "@questorylabs/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MusicTrackView } from "./music.track.view";
import type { MusicTrackViewProps } from "./music.track.types";

vi.mock("@/lib/music", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/music")>();
  return { ...actual, musicFetch: vi.fn().mockResolvedValue({}) };
});

const detail: MusicTrackDetail = {
  range: "all",
  track: {
    id: "t1",
    title: "Helix",
    userDisplayName: null,
    artistName: "Flume",
    artistId: "a1",
    releaseTitle: "Skin",
    releaseId: "r1",
    imageUrl: null,
    genres: [],
  },
  listenCount: 6,
  listeningMinutes: 20,
  uniqueDays: 3,
  avgListensPerDay: 2,
  peakHour: null,
  peakDow: null,
  topService: null,
};

const idleListens = mockResource<MusicTrackListenPage>({
  empty: false,
  failed: false,
  value: { total: 0, page: 1, pageSize: 15, items: [] },
});
const idleSeries = mockResource<MusicTimeBucket[]>({
  empty: false,
  failed: false,
  value: [],
});
const idleHeatmap = mockResource<MusicHeatmap>({
  empty: false,
  failed: false,
  value: { cells: [], dayLabels: [], hourLabels: [], maxCount: 0 },
});

const wrap = (ui: React.ReactNode) => {
  const store = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={store}>{ui}</ResourceProvider>);
};

const renderView = (patch: Partial<MusicTrackViewProps> = {}) =>
  wrap(
    <MusicTrackView
      {...({
        id: "t1",
        range: "all",
        onRangeChange: () => {},
        page: 1,
        setPage: () => {},
        detail: mockResource({ empty: false, failed: false, value: detail }),
        listens: idleListens,
        hourSeries: idleSeries,
        dowSeries: idleSeries,
        heatmap: idleHeatmap,
        saveBusy: false,
        mergeBusy: false,
        onSave: async () => {},
        onMerge: async () => {},
        onSaved: () => {},
        ...patch,
      } as MusicTrackViewProps)}
    />,
  );

describe("MusicTrackView", () => {
  afterEach(cleanup);

  it("shows an error when the track failed", () => {
    renderView({
      detail: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Track not found.")).toBeInTheDocument();
  });

  it("renders stats when ready", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Helix" })).toBeInTheDocument();
    expect(screen.getByText("Listens")).toBeInTheDocument();
  });
});
