import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MediaHistoryRow } from "./MediaHistoryRow";

describe("MediaHistoryRow", () => {
  afterEach(cleanup);

  it("links the title and shows kind, meta, trailing and date", () => {
    render(
      <ul>
        <MediaHistoryRow
          href="/watch/titles/1"
          title="Nobody 2"
          posterUrl={null}
          seed="1"
          kind="Movie"
          meta="Trakt · exact time"
          trailing={<span>tail</span>}
          date="Aug 1"
        />
      </ul>,
    );
    expect(screen.getByRole("link", { name: "Nobody 2" })).toHaveAttribute("href", "/watch/titles/1");
    expect(screen.getByText("Movie")).toBeInTheDocument();
    expect(screen.getByText(/Trakt · exact time/)).toBeInTheDocument();
    expect(screen.getByText("tail")).toBeInTheDocument();
    expect(screen.getByText("Aug 1")).toBeInTheDocument();
  });
});
