import { cleanup, render, screen } from "@testing-library/react";
import type { MusicPlayingNow, MusicRecentPage } from "@questorylabs/shared";
import { afterEach, describe, expect, it } from "vitest";
import { mockResource } from "@/test/resource-mock";
import { MusicListeningView } from "./music.listening.view";
import type { MusicListeningViewProps } from "./music.listening.types";

const emptyPlaying = mockResource<MusicPlayingNow>({
  empty: false,
  failed: false,
  value: null,
});

const page: MusicRecentPage = {
  total: 1,
  page: 1,
  pageSize: 15,
  items: [
    {
      id: "l1",
      listenedAt: "2026-08-01T12:00:00.000Z",
      track: {
        id: "t1",
        title: "Helix",
        artistId: "a1",
        artistName: "Flume",
        releaseId: null,
        releaseTitle: null,
        imageUrl: null,
        genres: [],
      },
    },
  ],
};

const renderView = (patch: Partial<MusicListeningViewProps> = {}) =>
  render(
    <MusicListeningView
      {...({
        recent: mockResource({ empty: false, failed: false, value: page }),
        playing: emptyPlaying,
        page: 1,
        setPage: () => {},
        ...patch,
      } as MusicListeningViewProps)}
    />,
  );

describe("MusicListeningView", () => {
  afterEach(cleanup);

  it("shows an error when recent failed", () => {
    renderView({
      recent: mockResource({ empty: true, failed: true }),
    });
    expect(screen.getByText("Could not load listens.")).toBeInTheDocument();
  });

  it("shows collection empty when ready with no items", () => {
    renderView({
      recent: mockResource({
        empty: false,
        failed: false,
        value: { total: 0, page: 1, pageSize: 15, items: [] },
      }),
    });
    expect(screen.getByText("No listens yet")).toBeInTheDocument();
  });

  it("renders listens when ready", () => {
    renderView();
    expect(screen.getAllByText("Helix").length).toBeGreaterThan(0);
  });
});
