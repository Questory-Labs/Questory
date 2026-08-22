import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NowPlayingPanel } from "./NowPlayingPanel";

describe("NowPlayingPanel", () => {
  afterEach(cleanup);

  it("links the current track and artist", () => {
    render(
      <NowPlayingPanel
        track={{
          id: "t1",
          title: "Helix",
          artistId: "a1",
          artistName: "Flume",
          releaseId: null,
          releaseTitle: null,
          imageUrl: null,
        }}
      />,
    );
    expect(screen.getByText("Now playing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Helix" })).toHaveAttribute(
      "href",
      "/music/tracks/t1",
    );
    expect(screen.getByRole("link", { name: "Flume" })).toHaveAttribute(
      "href",
      "/music/artists/a1",
    );
  });
});
