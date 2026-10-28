import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AlbumCardGrid } from "./AlbumCardGrid";
import { DetailHero } from "./DetailHero";
import { DetailKpiStrip } from "./DetailKpiStrip";
import { EqBars } from "./EqBars";
import { HourBars } from "./HourBars";
import { MusicBreadcrumb } from "./MusicBreadcrumb";
import { MusicKpiTile } from "./MusicKpiTile";
import { RankedBarList } from "./RankedBarList";
import { Vinyl } from "./Vinyl";

describe("music module components", () => {
  afterEach(cleanup);

  it("renders a vinyl with cover or initial", () => {
    const { container } = render(<Vinyl coverUrl="https://img/x.jpg" />);
    expect(screen.getByTestId("music-vinyl")).toBeInTheDocument();
    expect(container.querySelector("image")).not.toBeNull();
    cleanup();
    render(<Vinyl initial="F" />);
    expect(screen.getByText("F")).toBeInTheDocument();
  });

  it("renders eq bars", () => {
    render(<EqBars count={5} />);
    expect(screen.getByTestId("music-eq").children).toHaveLength(5);
  });

  it("renders a KPI tile with unit and note", () => {
    render(<MusicKpiTile label="Streak" value="9" unit=" days" note="Longest 12" tone="ok" />);
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();
    expect(screen.getByText("Longest 12")).toHaveClass("text-[var(--ok)]");
  });

  it("marks the peak hour bar", () => {
    const { container } = render(
      <HourBars
        buckets={[
          { key: "0", label: "12am", count: 1 },
          { key: "1", label: "1am", count: 4 },
          { key: "2", label: "2am", count: 2 },
        ]}
      />,
    );
    expect(screen.getAllByText("1am").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-peak]")).toHaveLength(1);
    cleanup();
    render(<HourBars buckets={[]} />);
    expect(screen.getByText("No listens in this range.")).toBeInTheDocument();
  });

  it("renders the detail hero with pills and stats", () => {
    render(
      <DetailHero
        eyebrow="Artist · #2"
        title="Flume"
        genres={["electronic"]}
        moods={["late night"]}
        stats={[{ label: "Listens", value: "12" }]}
        actions={<button type="button">Edit</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Flume" })).toBeInTheDocument();
    expect(screen.getByText("electronic")).toBeInTheDocument();
    expect(screen.getByText("late night")).toBeInTheDocument();
    expect(screen.getByText("Listens")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders a KPI strip and nothing when empty", () => {
    const { container, rerender } = render(
      <DetailKpiStrip items={[{ label: "Peak day", value: "Fri", hint: "6 listens" }]} />,
    );
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("6 listens")).toBeInTheDocument();
    rerender(<DetailKpiStrip items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a breadcrumb", () => {
    render(<MusicBreadcrumb href="/music/charts" label="Charts" current="Flume" />);
    expect(screen.getByRole("link", { name: "Charts" })).toHaveAttribute(
      "href",
      "/music/charts",
    );
    expect(screen.getByText("Flume")).toBeInTheDocument();
  });

  it("renders ranked bars with links, subs and empty state", () => {
    render(
      <RankedBarList
        title="Top songs"
        titleId="songs"
        items={[{ key: "t1", href: "/music/tracks/t1", label: "Helix", sub: "Skin", count: 4 }]}
        empty="None"
        footer={<span>more</span>}
      />,
    );
    expect(screen.getByRole("link", { name: /Helix/ })).toHaveAttribute(
      "href",
      "/music/tracks/t1",
    );
    expect(screen.getByText("Skin")).toBeInTheDocument();
    expect(screen.getByText("more")).toBeInTheDocument();
    cleanup();
    render(<RankedBarList title="Top songs" titleId="songs" items={[]} empty="None" />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("renders album cards", () => {
    render(
      <AlbumCardGrid
        titleId="albums"
        heading="Top albums"
        items={[{ key: "r1", href: "/music/albums/r1", title: "Skin", meta: "2016 · 7 listens" }]}
        empty="None"
      />,
    );
    expect(screen.getByRole("link", { name: /Skin/ })).toHaveAttribute(
      "href",
      "/music/albums/r1",
    );
    expect(screen.getByText("2016 · 7 listens")).toBeInTheDocument();
    cleanup();
    render(<AlbumCardGrid titleId="albums" heading="Top albums" items={[]} empty="None" />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });
});
