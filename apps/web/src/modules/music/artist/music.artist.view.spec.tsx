import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { MusicArtistDetail, MusicTimeBucket } from "@questorylabs/shared";
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
        hours: mockResource<MusicTimeBucket[]>({ empty: false, failed: false, value: [] }),
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
  it("renders rank, KPIs, albums with year and hour peak", () => {
    renderView({
      range: "month",
      detail: mockResource({
        empty: false,
        failed: false,
        value: {
          ...detail,
          range: "month",
          artist: { ...detail.artist, userDisplayName: "FLUME" },
          rank: 2,
          listeningMinutes: 90,
          peakHour: { hour: 22, label: "10pm", count: 5 },
          peakDow: { day: 1, label: "Mon", count: 6 },
          topAlbums: [{ id: "r1", title: "Skin", year: 2016, count: 7 }],
          topMoods: [{ id: "m1", name: "late night", count: 3 }],
        },
      }),
      hours: mockResource<MusicTimeBucket[]>({
        empty: false,
        failed: false,
        value: [
          { key: "21", label: "9pm", count: 2 },
          { key: "22", label: "10pm", count: 5 },
        ],
      }),
    });
    expect(screen.getByText("Artist · #2 this month")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FLUME" })).toBeInTheDocument();
    expect(screen.getByText("Flume")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getAllByText("10pm").length).toBeGreaterThan(0);
    expect(screen.getByText("2016 · 7 listens")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Skin/ })).toHaveAttribute(
      "href",
      "/music/albums/r1",
    );
    expect(screen.getByText("late night")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View top tracks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View top albums" })).toBeInTheDocument();
  });

  it("shows an hour error without hiding the artist", () => {
    renderView({ hours: mockResource({ empty: true, failed: true }) });
    expect(screen.getByText("Could not load hour-of-day listens.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Flume" })).toBeInTheDocument();
  });
});
