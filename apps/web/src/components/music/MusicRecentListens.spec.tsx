import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MusicRecentListens } from "./MusicRecentListens";

describe("MusicRecentListens", () => {
  afterEach(cleanup);

  it("shows an error before the empty skeleton", () => {
    render(
      <MusicRecentListens
        total={0}
        itemCount={0}
        empty
        failed
        refreshing={false}
        page={1}
        pageSize={15}
        onPageChange={() => {}}
      >
        <li>row</li>
      </MusicRecentListens>,
    );
    expect(screen.getByText("Could not load listens.")).toBeInTheDocument();
    expect(screen.queryByText("row")).not.toBeInTheDocument();
  });

  it("renders rows when ready", () => {
    render(
      <MusicRecentListens
        total={1}
        itemCount={1}
        empty={false}
        failed={false}
        refreshing={false}
        page={1}
        pageSize={15}
        onPageChange={() => {}}
      >
        <li>row</li>
      </MusicRecentListens>,
    );
    expect(screen.getByText("row")).toBeInTheDocument();
  });
});
